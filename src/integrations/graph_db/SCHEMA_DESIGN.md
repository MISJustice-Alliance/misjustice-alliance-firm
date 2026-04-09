# Neo4j GraphRAG Schema for Precedent Mapping

## 1. Graph Schema Definition (Cypher)

```
// ============================================================
// CONSTRAINTS & INDEXES
// ============================================================

// Unique constraints
CREATE CONSTRAINT case_citation_unique IF NOT EXISTS
FOR (c:Case) REQUIRE c.citation IS UNIQUE;

CREATE CONSTRAINT judge_name_unique IF NOT EXISTS
FOR (j:Judge) REQUIRE j.name IS UNIQUE;

CREATE CONSTRAINT issue_name_unique IF NOT EXISTS
FOR (i:LegalIssue) REQUIRE i.name IS UNIQUE;

CREATE CONSTRAINT provision_id_unique IF NOT EXISTS
FOR (p:ConstitutionalProvision) REQUIRE p.provision_id IS UNIQUE;

CREATE CONSTRAINT court_name_unique IF NOT EXISTS
FOR (ct:Court) REQUIRE ct.name IS UNIQUE;

// Vector index for semantic search
CREATE VECTOR INDEX case_embedding_index IF NOT EXISTS
FOR (c:Case) ON (c.embedding)
OPTIONS {indexConfig: {
 `vector.dimensions`: 1536,
 `vector.similarity_function`: 'cosine'
}};

// Text indexes for full-text search
CREATE FULLTEXT INDEX case_facts_index IF NOT EXISTS
FOR (c:Case) ON EACH [c.facts_summary, c.holding, c.reasoning];

CREATE FULLTEXT INDEX issue_index IF NOT EXISTS
FOR (i:LegalIssue) ON EACH [i.name, i.description];

// ============================================================
// NODE DEFINITIONS
// ============================================================

// Case nodes (primary entities)
CREATE (c:Case {
  citation: "384 U.S. 436",           // Unique citation (e.g., Miranda v. Arizona)
  case_name: "Miranda v. Arizona",
  short_name: "Miranda",
  year: 1966,
  month: 6,
  day: 13,
  facts_summary: "Defendant questioned in police custody without attorney...",
  holding: "Police must inform suspects of rights before custodial interrogation",
  reasoning: "The privilege against self-incrimination...",
  disposition: "Reversed and remanded",
  jurisdiction: "Federal",             // Federal, State, or International
  court_level: "Supreme Court",        // Supreme, Circuit, District, State Supreme, etc.
  precedential_value: "Mandatory",     // Mandatory, Persuasive, or Deprecated
  status: "Good Law",                  // Good Law, Overruled, Distinguished, Criticized
  embedding: null,                     // Vector embedding of full text
  created_at: datetime(),
  updated_at: datetime()
});

// Legal Issue nodes (hierarchical taxonomy)
CREATE (i:LegalIssue {
  name: "Self-Incrimination",
  category: "Criminal Procedure",
  subcategory: "Interrogation",
  description: "Protection against compelled testimonial communication",
  ussue_code: "CRIM-PROC-5TH-SELF-INC",
  embedding: null
});

// Constitutional Provision nodes
CREATE (cp:ConstitutionalProvision {
  provision_id: "US-CONST-AM5",
  document: "U.S. Constitution",
  amendment: 5,
  clause: "Self-Incrimination Clause",
  text: "No person... shall be compelled in any criminal case to be a witness against himself...",
  year_ratified: 1791,
  embedding: null
});

// Judge nodes
CREATE (j:Judge {
  name: "Earl Warren",
  court: "Supreme Court of the United States",
  tenure_start: date("1953-10-05"),
  tenure_end: date("1969-06-23"),
  appointing_president: "Dwight D. Eisenhower",
  judicial_philosophy: "Warren Court Liberal",
  reversal_rate: 0.72,                // Computed metric
  civil_rights_score: 0.85            // Computed affinity score
});

// Court nodes (hierarchical)
CREATE (ct:Court {
  name: "Supreme Court of the United States",
  court_code: "SCOTUS",
  jurisdiction: "Federal",
  level: 1,                           // 1 = Highest
  circuit: null,
  parent_court: null
});

// Citation nodes (for tracking citation frequency/context)
CREATE (cit:Citation {
  citation_id: "384-US-436-1966",
  volume: 384,
  reporter: "U.S.",
  page: 436,
  year: 1966,
  url: "https://supreme.justia.com/cases/federal/us/384/436/"
});

// Violation Pattern nodes (for AI detection)
CREATE (vp:ViolationPattern {
  pattern_id: "BRADY-WITHHOLD-001",
  pattern_type: "Brady Violation",
  description: "Prosecutor failed to disclose exculpatory evidence",
  indicators: ["withheld evidence", "exculpatory not disclosed", "prosecutor hid"],
  severity_weight: 0.9,
  embedding: null
});

// ============================================================
// RELATIONSHIP DEFINITIONS
// ============================================================

// Hierarchical case relationships
(c1:Case)-[:CITES { 
  context: "positive",           // positive, negative, distinguishing, questioning
  frequency: 1,                  // How many times cited
  depth: "holding",              // holding, dictum, procedural
  year_cited: 2023
}]->(c2:Case)

(c1:Case)-[:OVER_RULED_BY {
  year: 2000,
  explanation: "Overruled by Dickerson v. United States"
}]->(c2:Case)

(c1:Case)-[:DISTINGUISHED_BY {
  distinguishing_facts: "Different custodial setting",
  year: 1984
}]->(c2:Case)

// Issue relationships
(c:Case)-[:ADDRESSES {
  primary: true,                 // Primary vs. secondary issue
  outcome: "violation_found"     // violation_found, no_violation, procedural
}]->(i:LegalIssue)

(i1:LegalIssue)-[:SUB_ISSUE_OF {
  specificity: "narrow"          // narrow, broad
}]->(i2:LegalIssue)

// Constitutional provision relationships
(c:Case)-[:INTERPRETS {
  interpretation: "broad",       // broad, narrow, procedural
  holding_strength: "landmark"   // landmark, clarifying, procedural
}]->(cp:ConstitutionalProvision)

(cp1:ConstitutionalProvision)-[:RELATED_TO {
  relationship_type: "incorporation"  // incorporation, tension, synergy
}]->(cp2:ConstitutionalProvision)

// Judge relationships
(j:Judge)-[:AUTHORED {
  opinion_type: "majority",      // majority, dissent, concurrence
  joined_by: ["Justice Black", "Justice Douglas"]
}]->(c:Case)

(j:Judge)-[:PARTICIPATED_IN {
  vote: "majority",
  joined_opinion: true
}]->(c:Case)

// Court relationships
(c:Case)-[:DECIDED_BY]->(ct:Court)
(ct:Court)-[:APPEALS_TO]->(ct2:Court)  // Court hierarchy

// Citation metadata
(c:Case)-[:REPORTED_AS]->(cit:Citation)

// Semantic similarity (vector-based)
(c1:Case)-[:SEMANTICALLY_SIMILAR {
  score: 0.92,                   // Cosine similarity
  shared_concepts: ["custodial interrogation", "warnings"]
}]->(c2:Case)

// Violation pattern matching
(c:Case)-[:EXHIBITS_PATTERN {
  confidence: 0.95,
  evidence_locations: ["police_report_p3", "transcript_l45"]
}]->(vp:ViolationPattern)

// Temporal/factual similarity
(c1:Case)-[:FACTUALLY_SIMILAR {
  similarity_score: 0.88,
  shared_facts: ["warrantless search", "automobile"],
  distinguishing_facts: ["plain view vs. search incident"]
}]->(c2:Case)

// Judge behavior patterns
(j:Judge)-[:TENDS_TO {
  behavior: "rule_for_defendant",
  rate: 0.65,
  in_context: "Fourth Amendment cases"
}]->(i:LegalIssue)

```
