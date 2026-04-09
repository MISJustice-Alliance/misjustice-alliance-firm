from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass
from enum import Enum
import asyncio

from neo4j import AsyncGraphDatabase, AsyncDriver
from neo4j.exceptions import Neo4jError

from src.core.config import Settings
from src.core.logging import get_logger

logger = get_logger(__name__)


class CitationContext(Enum):
    POSITIVE = "positive"
    NEGATIVE = "negative"
    DISTINGUISHING = "distinguishing"
    QUESTIONING = "questioning"
    PROCEDURAL = "procedural"


@dataclass
class PrecedentPath:
    """Represents a path of precedential reasoning."""
    start_case: str
    end_case: str
    path_length: int
    total_similarity: float
    reasoning_chain: List[Dict[str, Any]]
    jurisprudential_strength: float  # Combined weight of path


@dataclass
class CaseSimilarity:
    """Semantic and factual similarity between cases."""
    case_citation: str
    case_name: str
    semantic_score: float
    factual_score: float
    shared_issues: List[str]
    distinguishing_facts: List[str]


class Neo4jGraphRAG:
    """
    GraphRAG client for legal precedent mapping.
    Combines vector similarity with graph traversal for multi-hop reasoning.
    """
    
    def __init__(self, uri: str, user: str, password: str):
        self.driver: AsyncDriver = AsyncGraphDatabase.driver(
            uri, auth=(user, password)
        )
        
    async def close(self):
        await self.driver.close()
    
    # ============================================================
    # CASE INGESTION
    # ============================================================
    
    async def ingest_case(
        self,
        citation: str,
        case_name: str,
        year: int,
        facts: str,
        holding: str,
        reasoning: str,
        issues: List[str],
        constitutional_provisions: List[str],
        cited_cases: List[Dict[str, Any]],
        embedding: List[float],
        judge: Optional[str] = None,
        court: Optional[str] = None
    ) -> bool:
        """
        Ingest a case into the graph with full relationships.
        """
        
        query = """
        // Create or merge case node
        MERGE (c:Case {citation: $citation})
        ON CREATE SET 
            c.case_name = $case_name,
            c.year = $year,
            c.facts_summary = $facts,
            c.holding = $holding,
            c.reasoning = $reasoning,
            c.embedding = $embedding,
            c.created_at = datetime(),
            c.precedential_value = 'Pending'
        ON MATCH SET
            c.updated_at = datetime()
        
        // Create citation node
        MERGE (cit:Citation {citation_id: $citation_id})
        SET cit.volume = $volume,
            cit.reporter = $reporter,
            cit.page = $page,
            cit.year = $year
        MERGE (c)-[:REPORTED_AS]->(cit)
        
        // Connect issues
        WITH c
        UNWIND $issues as issue_name
        MERGE (i:LegalIssue {name: issue_name})
        MERGE (c)-[:ADDRESSES {primary: true}]->(i)
        
        // Connect constitutional provisions
        WITH c
        UNWIND $provisions as provision_id
        MERGE (cp:ConstitutionalProvision {provision_id: provision_id})
        MERGE (c)-[:INTERPRETS]->(cp)
        
        // Connect cited cases with context
        WITH c
        UNWIND $cited_cases as cited
        MERGE (c2:Case {citation: cited.citation})
        ON CREATE SET c2.case_name = cited.case_name, c2.year = cited.year
        MERGE (c)-[r:CITES]->(c2)
        SET r.context = cited.context,
            r.frequency = cited.frequency,
            r.depth = cited.depth,
            r.year_cited = $year
        
        // Connect judge if provided
        WITH c
        CALL apoc.do.when(
            $judge IS NOT NULL,
            'MERGE (j:Judge {name: $judge}) MERGE (j)-[:AUTHORED {opinion_type: "majority"}]->(c)',
            '',
            {c: c, judge: $judge}
        ) YIELD value as judge_val
        
        // Connect court if provided
        WITH c
        CALL apoc.do.when(
            $court IS NOT NULL,
            'MERGE (ct:Court {name: $court}) MERGE (c)-[:DECIDED_BY]->(ct)',
            '',
            {c: c, court: $court}
        ) YIELD value as court_val
        
        RETURN c.citation as citation
        """
        
        # Parse citation components (e.g., "384 U.S. 436")
        citation_parts = citation.split()
        volume = int(citation_parts[0]) if citation_parts[0].isdigit() else 0
        reporter = citation_parts[1] if len(citation_parts) > 1 else "Unknown"
        page = int(citation_parts[2]) if len(citation_parts) > 2 and citation_parts[2].isdigit() else 0
        
        try:
            async with self.driver.session() as session:
                result = await session.run(
                    query,
                    citation=citation,
                    citation_id=citation.replace(" ", "-"),
                    case_name=case_name,
                    year=year,
                    facts=facts,
                    holding=holding,
                    reasoning=reasoning,
                    embedding=embedding,
                    volume=volume,
                    reporter=reporter,
                    page=page,
                    issues=issues,
                    provisions=constitutional_provisions,
                    cited_cases=cited_cases,
                    judge=judge,
                    court=court
                )
                record = await result.single()
                logger.info(f"Successfully ingested case: {record['citation']}")
                return True
                
        except Neo4jError as e:
            logger.error(f"Failed to ingest case {citation}: {e}")
            return False
    
    # ============================================================
    # GRAPHRAG RETRIEVAL PATTERNS
    # ============================================================
    
    async def find_similar_precedents(
        self,
        query_embedding: List[float],
        case_facts: str,
        legal_issues: List[str],
        top_k: int = 10,
        min_similarity: float = 0.7
    ) -> List[CaseSimilarity]:
        """
        Hybrid retrieval: Vector similarity + Graph traversal.
        Finds semantically similar cases that share legal issues.
        """
        
        query = """
        // Vector similarity search
        CALL db.index.vector.queryNodes('case_embedding_index', $top_k, $embedding)
        YIELD node as similar_case, score as semantic_score
        
        // Filter by minimum similarity
        WHERE semantic_score >= $min_similarity
        
        // Get shared issues
        OPTIONAL MATCH (similar_case)-[:ADDRESSES]->(issue:LegalIssue)
        WHERE issue.name IN $legal_issues
        
        // Get factual similarity via shared patterns
        OPTIONAL MATCH (similar_case)-[fs:FACTUALLY_SIMILAR]-(other:Case)
        
        // Calculate composite score
        WITH similar_case,
             semantic_score,
             collect(DISTINCT issue.name) as shared_issues,
             avg(fs.similarity_score) as factual_score
        
        RETURN similar_case.citation as citation,
               similar_case.case_name as case_name,
               similar_case.year as year,
               similar_case.holding as holding,
               semantic_score,
               coalesce(factual_score, 0.0) as factual_score,
               shared_issues
        ORDER BY (semantic_score * 0.6 + coalesce(factual_score, 0) * 0.4) DESC
        LIMIT $top_k
        """
        
        async with self.driver.session() as session:
            result = await session.run(
                query,
                embedding=query_embedding,
                legal_issues=legal_issues,
                top_k=top_k,
                min_similarity=min_similarity
            )
            
            similarities = []
            async for record in result:
                similarities.append(CaseSimilarity(
                    case_citation=record["citation"],
                    case_name=record["case_name"],
                    semantic_score=record["semantic_score"],
                    factual_score=record["factual_score"],
                    shared_issues=record["shared_issues"],
                    distinguishing_facts=[]  # Would need separate query
                ))
            
            return similarities
    
    async def find_precedential_path(
        self,
        start_citation: str,
        end_citation: str,
        max_depth: int = 5
    ) -> Optional[PrecedentPath]:
        """
        Find the path of precedential reasoning between two cases.
        Useful for establishing chains of authority.
        """
        
        query = """
        // Find shortest path through citations
        MATCH path = shortestPath(
            (start:Case {citation: $start})-[:CITES*1..$max_depth]-(end:Case {citation: $end})
        )
        
        // Extract path details
        WITH path,
             length(path) as path_length,
             [node in nodes(path) | {
                 citation: node.citation,
                 case_name: node.case_name,
                 year: node.year,
                 holding: left(node.holding, 200)
             }] as reasoning_chain
        
        // Calculate jurisprudential strength
        // Based on: path length (shorter = stronger), citation positivity, recency
        WITH path_length, reasoning_chain,
             reduce(strength = 1.0, rel in relationships(path) |
                strength * case rel.context 
                    when 'positive' then 1.0 
                    when 'negative' then 0.5 
                    else 0.75 
                    end
             ) as jurisprudential_strength
        
        RETURN path_length,
               reasoning_chain,
               jurisprudential_strength
        LIMIT 1
        """
        
        async with self.driver.session() as session:
            result = await session.run(
                query,
                start=start_citation,
                end=end_citation,
                max_depth=max_depth
            )
            
            record = await result.single()
            if not record:
                return None
            
            return PrecedentPath(
                start_case=start_citation,
                end_case=end_citation,
                path_length=record["path_length"],
                total_similarity=record["jurisprudential_strength"],
                reasoning_chain=record["reasoning_chain"],
                jurisprudential_strength=record["jurisprudential_strength"]
            )
    
    async def find_controlling_authority(
        self,
        jurisdiction: str,
        legal_issue: str,
        constitutional_provision: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Find mandatory (binding) precedent for a given jurisdiction and issue.
        Considers court hierarchy and overruled status.
        """
        
        query = """
        // Find cases addressing the issue
        MATCH (c:Case)-[:ADDRESSES]->(i:LegalIssue {name: $issue})
        WHERE c.jurisdiction = $jurisdiction
          AND c.status = 'Good Law'
          AND NOT (c)-[:OVER_RULED_BY]->()
        
        // Optional: Filter by constitutional provision
        WITH c
        CALL apoc.do.when(
            $provision IS NOT NULL,
            'MATCH (c)-[:INTERPRETS]->(cp:ConstitutionalProvision {provision_id: $provision}) RETURN count(cp) > 0 as has_provision',
            'RETURN true as has_provision',
            {c: c, provision: $provision}
        ) YIELD value as provision_check
        
        WITH c, provision_check
        WHERE provision_check.has_provision = true
        
        // Get court level for precedential value
        MATCH (c)-[:DECIDED_BY]->(ct:Court)
        
        // Get citation count (in-degree) as proxy for importance
        OPTIONAL MATCH (c)<-[cite:CITES]-()
        WITH c, ct, count(cite) as citation_count
        
        RETURN c.citation as citation,
               c.case_name as case_name,
               c.year as year,
               c.holding as holding,
               ct.name as court,
               ct.level as court_level,
               c.precedential_value as precedential_value,
               citation_count
        ORDER BY ct.level ASC, c.year DESC, citation_count DESC
        LIMIT 10
        """
        
        async with self.driver.session() as session:
            result = await session.run(
                query,
                jurisdiction=jurisdiction,
                issue=legal_issue,
                provision=constitutional_provision
            )
            return [record.data() async for record in result]
    
    async def find_distinguishing_cases(
        self,
        base_citation: str,
        legal_issue: str
    ) -> List[Dict[str, Any]]:
        """
        Find cases that distinguish themselves from the base case.
        Useful for finding limiting factors or different factual contexts.
        """
        
        query = """
        MATCH (base:Case {citation: $base_citation})-[:ADDRESSES]->(i:LegalIssue {name: $issue})
        
        // Find cases that cite base but distinguish it
        MATCH (distinguishing:Case)-[r:CITES {context: 'distinguishing'}]->(base)
        
        // Get the distinguishing facts
        OPTIONAL MATCH (distinguishing)-[fs:FACTUALLY_SIMILAR]->(base)
        
        RETURN distinguishing.citation as citation,
               distinguishing.case_name as case_name,
               distinguishing.year as year,
               distinguishing.holding as holding,
               r.explanation as distinguishing_reason,
               fs.distinguishing_facts as factual_differences,
               fs.similarity_score as similarity_score
        ORDER BY distinguishing.year DESC
        """
        
        async with self.driver.session() as session:
            result = await session.run(
                query,
                base_citation=base_citation,
                issue=legal_issue
            )
            return [record.data() async for record in result]
    
    async def get_judge_behavior_pattern(
        self,
        judge_name: str,
        legal_issue: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Analyze a judge's voting patterns on specific issues.
        """
        
        query = """
        MATCH (j:Judge {name: $judge})-[a:AUTHORED|PARTICIPATED_IN]->(c:Case)
        
        WITH j, c, a
        CALL apoc.do.when(
            $issue IS NOT NULL,
            'MATCH (c)-[addr:ADDRESSES]->(i:LegalIssue {name: $issue}) RETURN i.name as issue, addr.outcome as outcome',
            'RETURN null as issue, null as outcome',
            {c: c, issue: $issue}
        ) YIELD value as issue_data
        
        WITH j, c, a, issue_data
        WHERE $issue IS NULL OR issue_data.issue IS NOT NULL
        
        RETURN j.name as judge_name,
               count(DISTINCT c) as total_cases,
               sum(CASE WHEN a.opinion_type = 'majority' THEN 1 ELSE 0 END) as majority_opinions,
               sum(CASE WHEN issue_data.outcome = 'violation_found' THEN 1 ELSE 0 END) as violations_found,
               avg(CASE WHEN issue_data.outcome IS NOT NULL THEN 
                   CASE WHEN issue_data.outcome = 'violation_found' THEN 1.0 ELSE 0.0 END 
               END) as violation_finding_rate
        """
        
        async with self.driver.session() as session:
            result = await session.run(
                query,
                judge=judge_name,
                issue=legal_issue
            )
            record = await result.single()
            return record.data() if record else {}
    
    # ============================================================
    # VIOLATION PATTERN MATCHING
    # ============================================================
    
    async def match_violation_patterns(
        self,
        case_facts_embedding: List[float],
        indicators: List[str],
        top_k: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Find cases exhibiting similar violation patterns.
        Used by ConstitutionalViolationDetector.
        """
        
        query = """
        // Find violation patterns matching indicators
        MATCH (vp:ViolationPattern)
        WHERE any(indicator IN $indicators WHERE indicator IN vp.indicators)
        
        // Find cases exhibiting these patterns
        MATCH (c:Case)-[ex:EXHIBITS_PATTERN]->(vp)
        WHERE ex.confidence > 0.7
        
        // Calculate semantic similarity to current case facts
        WITH c, vp, ex,
             gds.similarity.cosine(c.embedding, $embedding) as semantic_similarity
        
        RETURN c.citation as citation,
               c.case_name as case_name,
               c.year as year,
               vp.pattern_type as violation_type,
               vp.pattern_id as pattern_id,
               ex.confidence as pattern_confidence,
               semantic_similarity,
               (ex.confidence * 0.5 + semantic_similarity * 0.5) as composite_score
        ORDER BY composite_score DESC
        LIMIT $top_k
        """
        
        async with self.driver.session() as session:
            result = await session.run(
                query,
                embedding=case_facts_embedding,
                indicators=indicators,
                top_k=top_k
            )
            return [record.data() async for record in result]
    
    async def create_semantic_relationships(
        self,
        citation: str,
        min_similarity: float = 0.85
    ):
        """
        Post-processing: Create SEMANTICALLY_SIMILAR relationships
        between cases based on vector similarity.
        """
        
        query = """
        MATCH (c:Case {citation: $citation})
        CALL db.index.vector.queryNodes('case_embedding_index', 20, c.embedding)
        YIELD node as similar, score
        
        WHERE score >= $min_similarity AND similar.citation <> c.citation
        
        MERGE (c)-[r:SEMANTICALLY_SIMILAR]->(similar)
        SET r.score = score,
            r.created_at = datetime()
        
        RETURN count(r) as relationships_created
        """
        
        async with self.driver.session() as session:
            result = await session.run(
                query,
                citation=citation,
                min_similarity=min_similarity
            )
            record = await result.single()
            logger.info(f"Created {record['relationships_created']} semantic relationships for {citation}")
            return record["relationships_created"]
