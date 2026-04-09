# src/integrations/graph_db/ingestion_pipeline.py

import asyncio
from typing import AsyncIterator, Dict, Any
import aiohttp

from src.integrations.graph_db.neo4j_client import Neo4jGraphRAG
from src.integrations.llm.litellm_client import LiteLLMClient
from src.core.logging import get_logger

logger = get_logger(__name__)


class CaseLawIngestionPipeline:
    """
    Pipeline for ingesting case law from external sources (CourtListener, etc.)
    into the Neo4j graph with embeddings and relationships.
    """
    
    def __init__(
        self,
        neo4j_client: Neo4jGraphRAG,
        llm_client: LiteLLMClient,
        batch_size: int = 10
    ):
        self.neo4j = neo4j_client
        self.llm = llm_client
        self.batch_size = batch_size
        
    async def ingest_from_courtlistener(
        self,
        query: str,
        jurisdiction: Optional[str] = None,
        max_cases: int = 100
    ):
        """
        Ingest cases from CourtListener API.
        """
        
        base_url = "https://www.courtlistener.com/api/rest/v3/opinions/"
        headers = {"Accept": "application/json"}
        
        params = {
            "q": query,
            "type": "o",  # Opinions
            "page_size": 20
        }
        if jurisdiction:
            params["court"] = jurisdiction
            
        count = 0
        
        async with aiohttp.ClientSession() as session:
            while count < max_cases:
                async with session.get(base_url, params=params, headers=headers) as resp:
                    data = await resp.json()
                    
                    if not data["results"]:
                        break
                    
                    # Process batch
                    tasks = []
                    for case_data in data["results"]:
                        if count >= max_cases:
                            break
                            
                        task = self._process_case(case_data)
                        tasks.append(task)
                        count += 1
                    
                    # Wait for batch to complete
                    await asyncio.gather(*tasks, return_exceptions=True)
                    
                    # Get next page
                    if not data.get("next"):
                        break
                    params["cursor"] = data["next"]
                    
        logger.info(f"Ingested {count} cases from CourtListener")
    
    async def _process_case(self, case_data: Dict[str, Any]):
        """Process single case: extract entities, generate embedding, ingest."""
        
        try:
            citation = case_data.get("citations", [{}])[0].get("cite", "Unknown")
            case_name = case_data.get("case_name", "Unknown")
            year = int(case_data.get("date_filed", "1900")[:4])
            facts = case_data.get("snippet", "")
            holding = case_data.get("syllabus", "")[:1000]
            reasoning = case_data.get("plain_text", "")[:5000]
            
            # Generate embedding
            embedding_text = f"{case_name}. {facts}. {holding}. {reasoning}"
            embedding = await self.llm.embed(embedding_text)
            
            # Extract issues using LLM
            issues = await self._extract_legal_issues(reasoning)
            
            # Extract constitutional provisions
            provisions = await self._extract_constitutional_provisions(reasoning)
            
            # Extract cited cases
            cited_cases = await self._extract_citations(case_data.get("citations", []))
            
            # Ingest to Neo4j
            success = await self.neo4j.ingest_case(
                citation=citation,
                case_name=case_name,
                year=year,
                facts=facts,
                holding=holding,
                reasoning=reasoning,
                issues=issues,
                constitutional_provisions=provisions,
                cited_cases=cited_cases,
                embedding=embedding,
                judge=case_data.get("author"),
                court=case_data.get("court")
            )
            
            if success:
                # Create semantic relationships
                await self.neo4j.create_semantic_relationships(citation)
                
        except Exception as e:
            logger.error(f"Failed to process case {case_data.get('id')}: {e}")
    
    async def _extract_legal_issues(self, text: str) -> List[str]:
        """Extract legal issues from case text using LLM."""
        prompt = f"Extract the main legal issues from this case text as a comma-separated list:\n\n{text[:2000]}"
        response = await self.llm.generate(prompt)
        return [issue.strip() for issue in response.split(",")]
    
    async def _extract_constitutional_provisions(self, text: str) -> List[str]:
        """Identify constitutional provisions mentioned."""
        provisions = []
        text_lower = text.lower()
        
        provision_map = {
            "fourth amendment": "US-CONST-AM4",
            "fifth amendment": "US-CONST-AM5",
            "sixth amendment": "US-CONST-AM6",
            "fourteenth amendment": "US-CONST-AM14",
            "due process": "US-CONST-AM14-DP",
            "equal protection": "US-CONST-AM14-EP",
            "brady": "BRADY-DOCTRINE"
        }
        
        for keyword, provision_id in provision_map.items():
            if keyword in text_lower:
                provisions.append(provision_id)
                
        return provisions
    
    async def _extract_citations(self, citations_data: List[Dict]) -> List[Dict[str, Any]]:
        """Format citations for graph relationships."""
        formatted = []
        for cite in citations_data:
            formatted.append({
                "citation": cite.get("cite", "Unknown"),
                "case_name": cite.get("case_name", "Unknown"),
                "year": cite.get("year", 1900),
                "context": "positive",  # Default, would need analysis
                "frequency": 1,
                "depth": "holding"
            })
        return formatted
