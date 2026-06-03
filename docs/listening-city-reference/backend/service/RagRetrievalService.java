package com.listeningcity.service;

import java.util.List;

/**
 * Interface tách rời — bạn implement bằng pgvector / Qdrant / Weaviate.
 *
 * Pseudo-impl với pgvector:
 *   1. Embed query bằng cùng model đã index knowledge base
 *   2. SELECT content FROM kb_chunks ORDER BY embedding <=> :queryEmb LIMIT :topK
 */
public interface RagRetrievalService {
    List<String> retrieve(String query, int topK);
}
