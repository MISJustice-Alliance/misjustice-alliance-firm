"""
Predefined GraphRAG query patterns for specific legal reasoning tasks.
These combine vector search with graph traversal for multi-hop reasoning.
"""

from typing import List, Dict, Any
from src.integrations.graph_db.neo4j_client import Neo4jGraphRAG


class LegalReasoningQueries:
    """Specialized queries for legal reasoning and precedent analysis."""
    
    def __init__(self, client: Neo4jGraphRAG):
        self.client = client
    
    async def chain_of_precedent(
        self,
        current_case_facts: str,
        target_outcome: str,  # e.g., "suppression_granted", "habeas_granted"
        jurisdiction: str
    ) -> List[Dict[str, Any]]:
        """
        Find the chain of precedent leading to a desired outcome.
        Useful for brief writing and argument construction.
        """
        
        query = """
        // Find semantically similar cases with target outcome
        CALL db.index.vector.queryNodes('case_embedding_index', 50, $embedding)
        YIELD node as case, score
        
        // Filter by outcome and jurisdiction
        MATCH (case)-[addr:ADDRESSES]->(issue:LegalIssue)
        WHERE addr.outcome = $outcome
          AND case.jurisdiction = $jurisdiction
          AND score > 0.75
        
        // Trace back through citations to find authority chain
        MATCH path = (case)-[:CITES*1..3]->(authority:Case)
        WHERE authority.precedential_value IN ['Mandatory', 'Landmark']
        
        // Calculate path strength
        WITH case, authority, path,
             reduce(s = 1.0, r in relationships(path) | 
                s * case r.context when 'positive' then 1.0 else 0.7 end
             ) as path_strength
        
        RETURN case.citation as supporting_case,
               case.case_name as case_name,
               case.year as year,
               case.holding as holding,
               collect(DISTINCT {
                   authority: authority.citation,
                   authority_name: authority.case_name,
                   path_strength: path_strength
               }) as authority_chain,
               score as similarity
        ORDER BY score DESC, path_strength DESC
        LIMIT 10
        """
        
        # Generate embedding for current case facts (would use actual embedding model)
        embedding = await self._get_embedding(current_case_facts)
        
        async with self.client.driver.session() as session:
            result = await session.run(
                query,
                embedding=embedding,
                outcome=target_outcome,
                jurisdiction=jurisdiction
            )
            return [record.data() async for record in result]
    
    async def constitutional_doctrine_evolution(
        self,
        provision_id: str,
        legal_issue: str
    ) -> List[Dict[str, Any]]:
        """
        Trace the evolution of constitutional doctrine over time.
        Shows how interpretation has changed through different eras.
        """
        
        query = """
        MATCH (cp:ConstitutionalProvision {provision_id: $provision})
        MATCH (cp)<-[i:INTERPRETS]-(c:Case)-[:ADDRESSES]->(issue:LegalIssue {name: $issue})
        
        // Get court and judge info
        OPTIONAL MATCH (c)-[:DECIDED_BY]->(ct:Court)
        OPTIONAL MATCH (j:Judge)-[:AUTHORED]->(c)
        
        // Get overruling relationships
        OPTIONAL MATCH (c)-[o:OVER_RULED_BY]->(overruler:Case)
        
        WITH c, i, ct, j, o, overruler
        ORDER BY c.year ASC
        
        RETURN c.year as year,
               c.citation as citation,
               c.case_name as case_name,
               i.interpretation as interpretation_type,
               i.holding_strength as holding_strength,
               c.holding as holding_summary,
               ct.name as court,
               j.name as authoring_judge,
               CASE WHEN overruler IS NOT NULL THEN {
                   overruling_case: overruler.citation,
                   overruling_year: overruler.year,
                   still_good_law: false
               } ELSE {
                   still_good_law: true
               } END as current_status
        """
        
        async with self.client.driver.session() as session:
            result = await session.run(
                query,
                provision=provision_id,
                issue=legal_issue
            )
            return [record.data() async for record in result]
    
    async def find_circuit_split(
        self,
        legal_issue: str
    ) -> List[Dict[str, Any]]:
        """
        Identify circuit splits (conflicting interpretations across circuits).
        Critical for determining forum shopping opportunities.
        """
        
        query = """
        MATCH (issue:LegalIssue {name: $issue})<-[:ADDRESSES]-(c:Case)
        MATCH (c)-[:DECIDED_BY]->(ct:CircuitCourt)
        
        // Group by circuit and outcome
        WITH ct.circuit as circuit_number,
             c.case_name as case_name,
             c.citation as citation,
             c.year as year,
             c.holding as holding
        
        // Find circuits with different outcomes
        WITH circuit_number,
             collect(DISTINCT {name: case_name, citation: citation, year: year, holding: holding}) as cases
        
        RETURN circuit_number as circuit,
               cases,
               size(cases) as case_count
        ORDER BY circuit_number
        """
        
        async with self.client.driver.session() as session:
            result = await session.run(query, issue=legal_issue)
            circuits = [record.data() async for record in result]
            
            # Post-process to detect actual splits (simplified)
            splits = []
            holdings = set()
            for circuit in circuits:
                # This would need more sophisticated NLP to detect true splits
                splits.append(circuit)
            
            return splits
    
    async def predict_outcome(
        self,
        case_facts_embedding: List[float],
        judge_name: Optional[str],
        court_name: str,
        legal_issues: List[str]
    ) -> Dict[str, Any]:
        """
        Predict case outcome based on similar past cases,
        judge behavior patterns, and court tendencies.
        """
        
        query = """
        // Find similar cases
        CALL db.index.vector.queryNodes('case_embedding_index', 20, $embedding)
        YIELD node as similar, score
        
        MATCH (similar)-[addr:ADDRESSES]->(issue:LegalIssue)
        WHERE issue.name IN $issues AND score > 0.8
        
        // Get outcomes
        WITH similar, addr, score
        GROUP BY addr.outcome
        WITH addr.outcome as outcome,
             count(*) as frequency,
             avg(score) as avg_similarity,
             collect(similar.citation)[0..3] as example_cases
        
        // Get judge pattern if specified
        CALL apoc.do.when(
            $judge IS NOT NULL,
            'MATCH (j:Judge {name: $judge}) RETURN j',
            'RETURN null as j',
            {judge: $judge}
        ) YIELD value as judge_data
        
        // Calculate prediction confidence
        WITH outcome, frequency, avg_similarity, example_cases, judge_data
        RETURN outcome,
               frequency,
               avg_similarity,
               example_cases,
               CASE 
                   WHEN judge_data.j IS NOT NULL THEN 'Judge pattern considered'
                   ELSE 'No judge data'
               END as prediction_basis
        ORDER BY frequency DESC, avg_similarity DESC
        LIMIT 3
        """
        
        async with self.client.driver.session() as session:
            result = await session.run(
                query,
                embedding=case_facts_embedding,
                judge=judge_name,
                court=court_name,
                issues=legal_issues
            )
            predictions = [record.data() async for record in result]
            
            # Calculate overall prediction
            total_freq = sum(p["frequency"] for p in predictions)
            for p in predictions:
                p["probability"] = p["frequency"] / total_freq if total_freq > 0 else 0
            
            return {
                "predictions": predictions,
                "confidence": "high" if predictions and predictions[0]["probability"] > 0.6 else "medium"
            }
    
    async def _get_embedding(self, text: str) -> List[float]:
        """Generate embedding for text (placeholder for actual embedding model)."""
        # This would call your embedding service (OpenAI, local model, etc.)
        # For now, return dummy embedding
        return [0.0] * 1536  # Placeholder
