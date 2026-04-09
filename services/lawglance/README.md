# LawGlance — MISJustice Alliance Corpus & Integration Guide

> **Service role:** Public legal information RAG microservice.  
> **Data boundary:** Public legal materials only — no privileged case data, PII, evidence, or Tier-0/Tier-1 content ever enters this service.  
> **Upstream source:** [github.com/lawglance/lawglance](https://github.com/lawglance/lawglance)  
> **Queried by:** Rae (Paralegal Researcher), Lex (Senior Analyst), Citation/Authority Agent  
> **Not queried by:** Avery, Mira, Iris, Casey, Ollie, Webmaster, Social Media Manager, Sol, Quill  

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [What LawGlance Does (and Does Not Do)](#2-what-lawglance-does-and-does-not-do)
3. [Corpus Extension — US Federal, Montana & Washington State Law](#3-corpus-extension)
4. [ChromaDB Multi-Collection Setup](#4-chromadb-multi-collection-setup)
5. [LangChain Chain Customization](#5-langchain-chain-customization)
6. [Prompt Customization for MISJustice Scope](#6-prompt-customization-for-misjustice-scope)
7. [LLM Backend — OpenAI vs. Ollama (Local/Private)](#7-llm-backend)
8. [Redis Cache Namespacing per Agent Tier](#8-redis-cache-namespacing)
9. [OpenClaw / AutoResearchClaw Integration Adapter](#9-integration-adapter)
10. [Environment Reference](#10-environment-reference)
11. [Kubernetes Deployment Notes](#11-kubernetes-deployment-notes)
12. [Data Boundary Policy](#12-data-boundary-policy)
13. [Corpus Sources Reference](#13-corpus-sources-reference)

---

## 1. Architecture Overview

LawGlance is a **LangChain + ChromaDB + Redis** RAG microservice. In its upstream form it
indexes Indian statutory law; this guide extends it with US federal, Montana, and Washington
State public legal materials for MISJustice Alliance research use.

```
┌────────────────────────────────────────────────────────┐
│              MISJustice LawGlance Instance              │
│                                                        │
│  ┌──────────────┐    ┌───────────────────────────────┐ │
│  │  REST / gRPC │    │  LangChain RAG Pipeline       │ │
│  │  API surface │───▶│  history_aware_retriever      │ │
│  │  (agent use) │    │  create_retrieval_chain       │ │
│  └──────────────┘    │  create_stuff_documents_chain │ │
│                      └────────────┬──────────────────┘ │
│                                   │                    │
│              ┌────────────────────┼──────────────┐     │
│              ▼                    ▼              ▼     │
│   ┌─────────────────┐  ┌──────────────┐  ┌──────────┐  │
│   │ ChromaDB        │  │ Redis Cache  │  │  LLM     │  │
│   │ collections:    │  │ session +    │  │ (OpenAI  │  │
│   │  us_federal     │  │ query cache  │  │  or      │  │
│   │  montana        │  │ namespaced   │  │ Ollama)  │  │
│   │  washington     │  │ per agent    │  └──────────┘  │
│   │  us_civil_rights│  └──────────────┘               │
│   │  (upstream)     │                                  │
│   │  indian_law     │                                  │
│   └─────────────────┘                                  │
└────────────────────────────────────────────────────────┘
```

The `Lawglance` class in `lawglance_main.py` accepts an injected `vector_store`, `llm`, and
`embeddings` at construction time — making it straightforward to swap corpus, model, and
collection without forking the core library.

---

## 2. What LawGlance Does (and Does Not Do)

| LawGlance IS used for | LawGlance is NEVER used for |
|---|---|
| Retrieving text of US federal statutes (42 U.S.C. § 1983, VAWA, FOIA, etc.) | Storing or retrieving case files, evidence, or MCAS records |
| Retrieving Montana Code Annotated provisions | Answering questions about specific MISJustice matters |
| Retrieving Washington State RCW provisions | Receiving any personal identifiers (names, addresses, case numbers) |
| Comparative statutory analysis across jurisdictions | Privileged work product, attorney memos, or internal analysis |
| Explaining legal standards (qualified immunity, deliberate indifference, elements of § 1983 claims) | Tier-0 or Tier-1 material of any kind |
| Public civil rights case law summaries (CourtListener-sourced) | Acting as a case management system |

Queries to LawGlance must be **abstract legal questions** — statute text, legal standards, procedural rules — never questions that embed case facts, party names, or identifying information.

---

## 3. Corpus Extension

### 3.1 Directory layout

```
services/lawglance/corpus/
├── us_federal/
│   ├── raw/          # Downloaded source PDFs / plain text files
│   ├── chunked/      # Pre-chunked JSON ready for embedding (auto-generated)
│   └── sources.yaml  # Source registry (URL, date, license)
├── montana/
│   ├── raw/
│   ├── chunked/
│   └── sources.yaml
├── washington/
│   ├── raw/
│   ├── chunked/
│   └── sources.yaml
└── us_civil_rights/
    ├── raw/
    ├── chunked/
    └── sources.yaml
```

### 3.2 Recommended source documents per collection

**`us_federal`**
- 42 U.S.C. § 1983 (Civil Action for Deprivation of Rights)
- 42 U.S.C. § 1985, § 1986 (Conspiracy; neglect to prevent)
- 42 U.S.C. § 1988 (Attorney's fees)
- Title VI Civil Rights Act (42 U.S.C. § 2000d)
- Title IX (20 U.S.C. § 1681)
- Violence Against Women Act — relevant provisions
- FOIA (5 U.S.C. § 552)
- ADA Title II (42 U.S.C. § 12131)
- Monell doctrine — key SCOTUS text (Monell v. Dep't of Social Services, 436 U.S. 658)
- Qualified immunity doctrine — Harlow v. Fitzgerald, Pearson v. Callahan

**`montana`**
- Montana Code Annotated (MCA): Title 46 (Criminal Procedure), Title 41 (Minors), Title 49 (Human Rights)
- Montana Constitution Article II (Declaration of Rights, § 10 right of privacy, § 17 due process)
- MT Rules of Civil Procedure (relevant sections)
- MT Rules of Evidence (relevant sections)
- Missoula County ordinances affecting shelter operations (relevant sections)

**`washington`**
- RCW Title 9A (Criminal Code), 10 (Criminal Procedure), 26 (Domestic Relations)
- Washington Law Against Discrimination (RCW 49.60)
- WA Public Records Act (RCW 42.56)
- WA Constitution Article I (Bill of Rights)

**`us_civil_rights`**
- CourtListener-sourced case summaries: § 1983 claims, Fourth Amendment, due process
- Downloadable via CourtListener bulk data API (see [Section 13](#13-corpus-sources-reference))

### 3.3 Ingestion script

Save as `services/lawglance/corpus/ingest.py` and run once per collection refresh:

```python
"""
MISJustice LawGlance corpus ingestion script.
Chunks source documents and loads them into the target ChromaDB collection.

Usage:
  python ingest.py --collection montana --source_dir corpus/montana/raw
"""

import argparse
import os
from pathlib import Path
from langchain_community.document_loaders import PyPDFLoader, TextLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings
from langchain_chroma import Chroma

# --- Config ---
CHROMA_PATH = os.getenv("CHROMA_PATH", "./chroma_db_misjustice")
CHUNK_SIZE   = 1000   # tokens; reduce to 600 for dense statutory text
CHUNK_OVERLAP = 150

COLLECTION_MAP = {
    "us_federal":     "misjustice_us_federal",
    "montana":        "misjustice_montana",
    "washington":     "misjustice_washington",
    "us_civil_rights": "misjustice_civil_rights",
    "indian_law":     "lawglance_indian_law",   # upstream collection; do not overwrite
}

def load_documents(source_dir: Path):
    docs = []
    for f in source_dir.rglob("*"):
        if f.suffix == ".pdf":
            loader = PyPDFLoader(str(f))
        elif f.suffix in (".txt", ".md"):
            loader = TextLoader(str(f), encoding="utf-8")
        else:
            continue
        docs.extend(loader.load())
        print(f"  Loaded: {f.name} ({len(docs)} docs so far)")
    return docs

def ingest(collection_key: str, source_dir: str):
    collection_name = COLLECTION_MAP[collection_key]
    source_path = Path(source_dir)

    print(f"\n[ingest] Collection: {collection_name}")
    print(f"[ingest] Source dir: {source_path.resolve()}")

    raw_docs = load_documents(source_path)
    print(f"[ingest] Loaded {len(raw_docs)} raw documents")

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
        separators=["\n\n", "\n", ". ", " "],
    )
    chunks = splitter.split_documents(raw_docs)
    print(f"[ingest] Split into {len(chunks)} chunks")

    # Add jurisdiction metadata to every chunk for filtered retrieval
    for chunk in chunks:
        chunk.metadata["jurisdiction"] = collection_key
        chunk.metadata["collection"]   = collection_name

    embeddings = OpenAIEmbeddings()  # swap for OllamaEmbeddings if using local LLM
    vector_store = Chroma(
        collection_name=collection_name,
        persist_directory=CHROMA_PATH,
        embedding_function=embeddings,
    )
    vector_store.add_documents(chunks)
    print(f"[ingest] Done. {len(chunks)} chunks written to {CHROMA_PATH}/{collection_name}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--collection", required=True, choices=list(COLLECTION_MAP.keys()))
    parser.add_argument("--source_dir", required=True)
    args = parser.parse_args()
    ingest(args.collection, args.source_dir)
```

---

## 4. ChromaDB Multi-Collection Setup

LawGlance's upstream `app.py` initializes a single Chroma collection:

```python
# upstream (single collection)
vector_store = Chroma(
    persist_directory="chroma_db_legal_bot_part1",
    embedding_function=embeddings
)
```

For MISJustice, replace this with a **collection-aware factory** that lets agents
specify which jurisdiction collection to search, or query all at once with a merged
retriever:

```python
# services/lawglance/misjustice_vector_store.py

import os
from langchain_chroma import Chroma
from langchain.retrievers import MergerRetriever

CHROMA_PATH = os.getenv("CHROMA_PATH", "./chroma_db_misjustice")

COLLECTIONS = {
    "us_federal":      "misjustice_us_federal",
    "montana":         "misjustice_montana",
    "washington":      "misjustice_washington",
    "us_civil_rights": "misjustice_civil_rights",
    "indian_law":      "lawglance_indian_law",
}

def get_collection(collection_key: str, embeddings):
    """Return a single-collection Chroma vector store."""
    return Chroma(
        collection_name=COLLECTIONS[collection_key],
        persist_directory=CHROMA_PATH,
        embedding_function=embeddings,
    )

def get_merged_retriever(embeddings, k: int = 6, score_threshold: float = 0.3):
    """
    Return a MergerRetriever that queries all MISJustice collections in parallel
    and merges results. Use for Rae/Lex broad jurisdiction queries.
    """
    retrievers = []
    for key in ["us_federal", "montana", "washington", "us_civil_rights"]:
        store = get_collection(key, embeddings)
        retrievers.append(
            store.as_retriever(
                search_type="similarity_score_threshold",
                search_kwargs={"k": k, "score_threshold": score_threshold},
            )
        )
    return MergerRetriever(retrievers=retrievers)

def get_jurisdiction_retriever(jurisdiction: str, embeddings, k: int = 10, score_threshold: float = 0.3):
    """
    Return a single-jurisdiction retriever.
    jurisdiction: one of 'us_federal', 'montana', 'washington', 'us_civil_rights', 'indian_law'
    """
    store = get_collection(jurisdiction, embeddings)
    return store.as_retriever(
        search_type="similarity_score_threshold",
        search_kwargs={"k": k, "score_threshold": score_threshold},
    )
```

---

## 5. LangChain Chain Customization

The upstream `chains.py` builds a `history_aware_retriever` → `stuff_documents_chain` →
`retrieval_chain` pipeline. The MISJustice deployment uses the same pipeline structure but
passes a **jurisdiction-aware retriever** and the **MISJustice prompts** defined in Section 6.

```python
# services/lawglance/misjustice_chain.py

from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain.chains import create_retrieval_chain, create_history_aware_retriever
from langchain.prompts import ChatPromptTemplate
from langchain_core.prompts import MessagesPlaceholder

from misjustice_prompts import MISJUSTICE_SYSTEM_PROMPT, MISJUSTICE_QA_PROMPT


def get_misjustice_rag_chain(llm, retriever):
    """
    Build a MISJustice-scoped RAG chain with the given retriever.
    The retriever can be a single-jurisdiction retriever or a MergerRetriever.

    Args:
        llm:       LangChain LLM instance (ChatOpenAI or ChatOllama)
        retriever: A LangChain retriever (from misjustice_vector_store.py)

    Returns:
        LangChain retrieval_chain
    """
    # Step 1: History-aware question reformulation
    contextualize_q_prompt = ChatPromptTemplate.from_messages([
        (
            "system",
            "Given a chat history and the latest legal research question which might reference "
            "prior context, reformulate it as a standalone question about US federal, Montana, or "
            "Washington State law. Do NOT answer — just reformulate if needed, otherwise return as-is."
        ),
        MessagesPlaceholder("chat_history"),
        ("human", "{input}"),
    ])
    history_aware_retriever = create_history_aware_retriever(llm, retriever, contextualize_q_prompt)

    # Step 2: Answer generation over retrieved documents
    qa_prompt = ChatPromptTemplate.from_messages([
        ("system", MISJUSTICE_SYSTEM_PROMPT),
        MessagesPlaceholder(variable_name="chat_history"),
        ("human", MISJUSTICE_QA_PROMPT),
    ])
    question_answer_chain = create_stuff_documents_chain(llm, qa_prompt)

    # Step 3: Assemble retrieval chain
    return create_retrieval_chain(history_aware_retriever, question_answer_chain)
```

---

## 6. Prompt Customization for MISJustice Scope

Save as `services/lawglance/misjustice_prompts.py`. These replace the upstream `prompts.py`
for the MISJustice deployment.

```python
# services/lawglance/misjustice_prompts.py

MISJUSTICE_SYSTEM_PROMPT = """
You are a legal information assistant operating within the MISJustice Alliance research platform.

Your role is to provide accurate, citation-grounded public legal information to support legal
research, civil rights advocacy, and statutory analysis. You do not provide legal advice.

Legal Knowledge Domains (this instance):
  US Federal:
    - 42 U.S.C. § 1983 (Civil Action for Deprivation of Rights)
    - 42 U.S.C. § 1985, § 1986 (Conspiracy; neglect to prevent)
    - 42 U.S.C. § 1988 (Attorney's fees in civil rights actions)
    - Title VI Civil Rights Act (42 U.S.C. § 2000d)
    - Title IX (20 U.S.C. § 1681)
    - Violence Against Women Act (VAWA) — relevant provisions
    - FOIA (5 U.S.C. § 552)
    - ADA Title II (42 U.S.C. § 12131)
    - Fourth Amendment, Fourteenth Amendment (Due Process, Equal Protection)
    - Monell doctrine, qualified immunity doctrine

  Montana (MCA):
    - Title 46 (Criminal Procedure)
    - Title 41 (Minors — dependency, abuse, neglect)
    - Title 49 (Human Rights)
    - Montana Constitution Article II (Declaration of Rights)
    - Missoula County ordinances (relevant shelter and DV provisions)

  Washington State (RCW):
    - RCW Title 9A (Criminal Code), 10 (Criminal Procedure), 26 (Domestic Relations)
    - Washington Law Against Discrimination (RCW 49.60)
    - WA Public Records Act (RCW 42.56)
    - WA Constitution Article I (Bill of Rights)

  US Civil Rights Case Law:
    - Key SCOTUS and circuit court decisions on § 1983, qualified immunity,
      Fourth Amendment, due process, municipal liability (Monell)

Operational constraints:
  - Answer only using the retrieved legal text provided in context.
  - Never fabricate statutory text, case citations, or legal holdings.
  - Never accept or repeat case-specific facts, names, or identifiers — if a query
    contains such information, decline and instruct the caller to rephrase as an
    abstract legal question.
  - If no relevant context exists, say so clearly. Do not speculate.
  - This is not legal advice. Always end answers with the standard MISJustice
    legal information disclaimer.

Question: {input}
"""

MISJUSTICE_QA_PROMPT = """
Use ONLY the retrieved context below to answer the question.

Guidelines:
  1. Identify the most directly relevant statutory provisions, constitutional text,
     or case holdings in the context.
  2. Cite the specific statute, section, or case by name/number in your answer.
  3. Provide a concise, accurate response (3–5 sentences for statute questions;
     up to 8 sentences for doctrinal analysis questions).
  4. If the question asks for a comparison across jurisdictions (e.g., Montana vs.
     federal standard), address each jurisdiction separately, clearly labeled.
  5. If no relevant context exists, respond:
     "The current MISJustice LawGlance corpus does not contain sufficient material
     to answer this question. Consider querying CourtListener or Free Law Project
     directly for this research need."

Standard disclaimer (always append):
  _This response provides public legal information only and does not constitute
  legal advice. Consult a licensed attorney for advice on specific matters._

Relevant Context:
{context}
"""
```

---

## 7. LLM Backend

### 7.1 OpenAI (default upstream)

```python
from langchain_openai import ChatOpenAI, OpenAIEmbeddings

llm        = ChatOpenAI(model="gpt-4o-mini", temperature=0.2)  # lower temp for legal factual
embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
```

`temperature=0.2` is recommended over the upstream `0.9` for legal information use — lower
temperature reduces hallucination risk on statutory text.

### 7.2 Ollama (local / fully private, no OpenAI dependency)

Preferred for MISJustice deployments where all LLM inference must remain on-premises.

```python
from langchain_ollama import ChatOllama, OllamaEmbeddings

llm = ChatOllama(
    model="llama3.1:8b",          # or mistral, gemma3, phi4
    base_url="http://ollama:11434",
    temperature=0.1,
)
embeddings = OllamaEmbeddings(
    model="nomic-embed-text",      # 768-dim; fast and accurate
    base_url="http://ollama:11434",
)
```

**Recommended Ollama models for legal RAG:**

| Model | Notes |
|---|---|
| `llama3.1:8b` | Best balance of speed and quality for legal Q&A at 8B scale |
| `mistral:7b-instruct` | Strong instruction following; good for structured legal output |
| `gemma3:12b` | Higher quality at 12B; use if GPU VRAM allows |
| `phi4:14b` | Microsoft Phi-4; strong reasoning at 14B |
| `nomic-embed-text` | Embeddings model — use for all collections regardless of LLM choice |

To switch the deployment from OpenAI to Ollama, set `LLM_BACKEND=ollama` in `.env` and
update `lawglance.env.example` accordingly (see [Section 10](#10-environment-reference)).

---

## 8. Redis Cache Namespacing

The upstream `RedisCache` in `cache.py` uses a flat key namespace. For MISJustice, namespace
cache keys per agent tier to prevent cross-agent cache pollution and to allow selective cache
invalidation by tier without flushing the entire store.

```python
# services/lawglance/misjustice_cache.py
#
# Wraps the upstream RedisCache with per-agent-tier key namespacing.

import hashlib
from cache import RedisCache  # upstream

TIER_PREFIXES = {
    "rae":      "t1",
    "lex":      "t2",
    "citation": "t1",
    "default":  "t0",
}

class MISJusticeCache(RedisCache):
    """
    Extends upstream RedisCache with agent-tier key namespacing.
    Keys are structured as:  misjustice:{tier}:{sha256(query+session)}
    """

    def make_cache_key(self, query: str, session_id: str, agent_id: str = "default") -> str:
        tier   = TIER_PREFIXES.get(agent_id, TIER_PREFIXES["default"])
        digest = hashlib.sha256(f"{query}::{session_id}".encode()).hexdigest()[:24]
        return f"misjustice:{tier}:{digest}"

    def flush_tier(self, tier: str):
        """
        Flush all cache entries for a given agent tier.
        Useful after corpus updates to a specific jurisdiction collection.
        """
        pattern = f"misjustice:{tier}:*"
        keys = self.redis_client.keys(pattern)
        if keys:
            self.redis_client.delete(*keys)
        return len(keys)
```

Usage in the MISJustice `Lawglance` instance initialization:

```python
from misjustice_cache import MISJusticeCache

cache = MISJusticeCache(redis_url=os.getenv("REDIS_URL", "redis://redis:6379/0"))
law   = Lawglance(llm=llm, embeddings=embeddings, vector_store=vector_store)
law.cache = cache  # replace default cache with namespaced version
```

---

## 9. Integration Adapter

This adapter is the entry point called by AutoResearchClaw, Rae, Lex, and the Citation Agent
via the OpenClaw tool-call interface. It wraps `Lawglance.conversational()` with jurisdiction
routing, agent-tier cache namespacing, and the MISJustice RAG chain.

```python
# services/lawglance/misjustice_adapter.py
"""
MISJustice LawGlance integration adapter.
Callable by OpenClaw / AutoResearchClaw agents as a named tool.

Tool name (register in OpenClaw):  lawglance_query

Input schema:
  {
    "query":        str,   # abstract legal question — NO case facts or PII
    "jurisdiction": str,   # "us_federal" | "montana" | "washington" | "us_civil_rights" | "all"
    "agent_id":     str,   # "rae" | "lex" | "citation"
    "session_id":   str    # agent session UUID for chat history continuity
  }

Output:
  {
    "answer":   str,
    "sources":  list[dict],  # chunk metadata: jurisdiction, source, page
    "cached":   bool
  }
"""

import os
import logging
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_ollama import ChatOllama, OllamaEmbeddings

from lawglance_main import Lawglance
from misjustice_vector_store import get_merged_retriever, get_jurisdiction_retriever
from misjustice_chain import get_misjustice_rag_chain
from misjustice_cache import MISJusticeCache

logger = logging.getLogger("lawglance.adapter")

# --- LLM and embeddings initialization ---

LLM_BACKEND = os.getenv("LLM_BACKEND", "openai")  # "openai" | "ollama"

if LLM_BACKEND == "ollama":
    llm = ChatOllama(
        model=os.getenv("OLLAMA_MODEL", "llama3.1:8b"),
        base_url=os.getenv("OLLAMA_BASE_URL", "http://ollama:11434"),
        temperature=float(os.getenv("LLM_TEMPERATURE", "0.1")),
    )
    embeddings = OllamaEmbeddings(
        model=os.getenv("OLLAMA_EMBED_MODEL", "nomic-embed-text"),
        base_url=os.getenv("OLLAMA_BASE_URL", "http://ollama:11434"),
    )
else:
    llm = ChatOpenAI(
        model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
        temperature=float(os.getenv("LLM_TEMPERATURE", "0.2")),
        openai_api_key=os.getenv("OPENAI_API_KEY"),
    )
    embeddings = OpenAIEmbeddings(
        model=os.getenv("OPENAI_EMBED_MODEL", "text-embedding-3-small"),
    )

# --- Cache ---
cache = MISJusticeCache(redis_url=os.getenv("REDIS_URL", "redis://redis:6379/0"))


def lawglance_query(
    query:        str,
    jurisdiction: str  = "all",
    agent_id:     str  = "default",
    session_id:   str  = "default-session",
) -> dict:
    """
    Primary entry point for agent tool calls.

    Raises ValueError if the query appears to contain case-specific PII
    (names, case numbers) — enforcing the data boundary at the adapter layer.
    """
    # --- Data boundary guard ---
    _check_pii_guard(query)

    # --- Jurisdiction routing ---
    if jurisdiction == "all":
        retriever = get_merged_retriever(embeddings)
    else:
        retriever = get_jurisdiction_retriever(jurisdiction, embeddings)

    # --- Build chain ---
    rag_chain = get_misjustice_rag_chain(llm, retriever)

    # --- Build a minimal Lawglance instance with injected chain ---
    law = Lawglance(llm=llm, embeddings=embeddings, vector_store=None)
    law.cache = cache

    # Cache key includes agent tier
    cache_key    = cache.make_cache_key(query, session_id, agent_id)
    cached_answer = cache.get(cache_key)
    if cached_answer:
        logger.info(f"[lawglance] Cache HIT | agent={agent_id} | key={cache_key}")
        return {"answer": cached_answer, "sources": [], "cached": True}

    # Invoke chain directly (bypasses Lawglance.conversational for chain injection)
    history_obj = law.get_session_history(session_id)
    response    = rag_chain.invoke(
        {"input": query, "chat_history": history_obj.messages},
        config={"configurable": {"session_id": session_id}},
    )

    answer = response["answer"]
    sources = [
        {
            "jurisdiction": doc.metadata.get("jurisdiction", "unknown"),
            "source":       doc.metadata.get("source", ""),
            "page":         doc.metadata.get("page", ""),
        }
        for doc in response.get("context", [])
    ]

    history_obj.add_user_message(query)
    history_obj.add_ai_message(answer)
    cache.set(cache_key, answer)

    logger.info(f"[lawglance] Answered | agent={agent_id} | jurisdiction={jurisdiction} | sources={len(sources)}")
    return {"answer": answer, "sources": sources, "cached": False}


# --- PII / data boundary guard ---

import re

# Patterns that suggest case-identifying content — reject at the adapter
_PII_PATTERNS = [
    r"\b[A-Z][a-z]+ v\.? [A-Z][a-z]+\b",    # case-style names
    r"\bcase\s*(no|number|#)[\s.:]*\d+",       # case numbers
    r"\b\d{3}-\d{2,4}-[A-Z]{2,}\b",           # docket-like identifiers
]

def _check_pii_guard(query: str):
    for pattern in _PII_PATTERNS:
        if re.search(pattern, query, re.IGNORECASE):
            raise ValueError(
                f"[lawglance] Query rejected by PII guard — appears to contain case-specific "
                f"identifiers. Rephrase as an abstract legal question before querying LawGlance. "
                f"Pattern matched: {pattern}"
            )
```

**Registering the tool in OpenClaw:**

```yaml
# agents/rae/agent.yaml (excerpt)
tools:
  - name: lawglance_query
    type: python_callable
    module: services.lawglance.misjustice_adapter
    function: lawglance_query
    description: >
      Query the MISJustice LawGlance legal information RAG for public statutory
      text, civil rights legal standards, and jurisdiction-specific public law.
      Use for abstract legal questions about US federal, Montana, or Washington
      State law. Never include case-specific facts, names, or identifiers in queries.
    input_schema:
      query:        {type: string, required: true}
      jurisdiction: {type: string, default: "all",
                     enum: [all, us_federal, montana, washington, us_civil_rights]}
      agent_id:     {type: string, default: "rae"}
      session_id:   {type: string, required: true}
```

---

## 10. Environment Reference

```bash
# services/lawglance/lawglance.env.example
# Copy to .env and populate before deployment.
# Never commit .env to git.

# ── LLM Backend ─────────────────────────────────────────────
# "openai" (default) | "ollama" (fully private, on-premises)
LLM_BACKEND=ollama

# OpenAI (only if LLM_BACKEND=openai)
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
OPENAI_EMBED_MODEL=text-embedding-3-small

# Ollama (only if LLM_BACKEND=ollama)
OLLAMA_BASE_URL=http://ollama:11434
OLLAMA_MODEL=llama3.1:8b
OLLAMA_EMBED_MODEL=nomic-embed-text

# ── LLM tuning ──────────────────────────────────────────────
# Recommend 0.1–0.2 for legal factual retrieval
LLM_TEMPERATURE=0.1

# ── ChromaDB ────────────────────────────────────────────────
CHROMA_PATH=/data/chroma_db_misjustice

# ── Redis ───────────────────────────────────────────────────
REDIS_URL=redis://redis:6379/0

# ── Service ─────────────────────────────────────────────────
LAWGLANCE_PORT=8501
LOG_LEVEL=INFO
```

---

## 11. Kubernetes Deployment Notes

The K8s manifests live at `infra/k8s/lawglance/`. Key notes for MISJustice deployment:

**`deployment.yaml`**
- Mount the ChromaDB PersistentVolumeClaim at `CHROMA_PATH`.
- Mount the Redis service as an env var via `REDIS_URL`.
- Reference the `lawglance-config` ConfigMap for corpus/LLM settings.
- Reference the `lawglance-secrets` Secret for `OPENAI_API_KEY` (or omit if using Ollama).
- Add a `NetworkPolicy` rule: LawGlance pods may only receive inbound traffic from
  `agent-namespace` pods with labels `app in (rae, lex, citation-agent)` — not from
  MCAS, OpenRAG, Avery, Iris, or any external ingress.

**`configmap.yaml`** (excerpt)
```yaml
data:
  LLM_BACKEND:        "ollama"
  OLLAMA_BASE_URL:    "http://ollama.llm-svc:11434"
  OLLAMA_MODEL:       "llama3.1:8b"
  OLLAMA_EMBED_MODEL: "nomic-embed-text"
  CHROMA_PATH:        "/data/chroma_db_misjustice"
  REDIS_URL:          "redis://redis-svc:6379/0"
  LLM_TEMPERATURE:    "0.1"
  LOG_LEVEL:          "INFO"
```

**Corpus PVC:**
```yaml
# infra/k8s/lawglance/pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: lawglance-chroma-pvc
  namespace: misjustice
spec:
  accessModes: [ReadWriteOnce]
  resources:
    requests:
      storage: 20Gi   # increase for full MT/WA statutory corpus
```

**Network isolation rule (add to `deployment.yaml` or a separate `NetworkPolicy`):**
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: lawglance-ingress-policy
  namespace: misjustice
spec:
  podSelector:
    matchLabels:
      app: lawglance
  policyTypes: [Ingress]
  ingress:
    - from:
        - podSelector:
            matchExpressions:
              - key: app
                operator: In
                values: [rae, lex, citation-agent]
```

---

## 12. Data Boundary Policy

This section defines what **must never** enter LawGlance, enforced at multiple layers:

| Boundary layer | Mechanism |
|---|---|
| **Agent prompt policy** | Rae, Lex, Citation Agent system prompts instruct agents to rephrase queries as abstract legal questions before calling `lawglance_query` |
| **Adapter PII guard** | `_check_pii_guard()` in `misjustice_adapter.py` rejects queries containing case-style names, docket numbers, or structured identifiers with a `ValueError` before any data reaches the RAG chain |
| **Network policy** | K8s `NetworkPolicy` blocks inbound traffic to LawGlance pods from MCAS, OpenRAG, Avery, Mira, Iris, Casey, and all external ingress |
| **No MCAS connection** | LawGlance has no API credentials, service account, or network path to MCAS |
| **Corpus content policy** | The `ingest.py` script only accepts files from `services/lawglance/corpus/` — no MCAS exports, case documents, or intake materials are ever placed in this directory |
| **Audit log** | All `lawglance_query` calls are logged by the adapter with `agent_id`, `jurisdiction`, and a hash of the query — never the raw query if it fails the PII guard |

**Never place in `services/lawglance/corpus/`:**
- MCAS case exports of any tier
- Intake forms, affidavits, or evidence documents
- Deposition transcripts or attorney work product
- Any file containing a person's name linked to a case matter
- Anything classified Tier-0 or Tier-1

---

## 13. Corpus Sources Reference

| Corpus | Source | Access method | License |
|---|---|---|---|
| US Federal statutes | [uscode.house.gov](https://uscode.house.gov/download/download.shtml) | Bulk XML/PDF download | Public domain |
| Montana Code Annotated | [leg.mt.gov](https://leg.mt.gov/bills/mca/) | Bulk HTML download | Public domain |
| Washington State RCW | [app.leg.wa.gov](https://app.leg.wa.gov/rcw/) | Bulk XML download | Public domain |
| Federal civil rights case law | [CourtListener Bulk Data API](https://www.courtlistener.com/api/bulk-info/) | API — free registration | CC BY-SA (opinions) |
| Free Law Project opinions | [free.law/bulk-data](https://free.law/bulk-data/) | Bulk download | CC BY-SA |
| SCOTUS opinions | [supremecourt.gov](https://www.supremecourt.gov/opinions/opinions.aspx) | Direct PDF download | Public domain |

All corpus materials used in the MISJustice LawGlance instance must be:
1. Public domain or open-licensed (CC BY or CC BY-SA acceptable).
2. Sourced from official government or recognized open law repositories.
3. Listed with download date and source URL in the corresponding `corpus/*/sources.yaml`.
4. Free of any case-specific or personal identifying information.

---

*MISJustice Alliance — Legal Research. Civil Rights. Public Record.*
