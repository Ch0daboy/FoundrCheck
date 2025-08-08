export type IdeaRow = {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  idea_hash: string;
  visibility: string;
  status: string;
  score: number | null;
  analysis_summary: string | null;
  analysis_raw: string | null;
  created_at: string;
  updated_at: string;
};

export function sanitizeIdea(row: IdeaRow, viewerId: string | null) {
  const isOwner = viewerId && row.owner_id === viewerId;
  return {
    id: row.id,
    owner_id: isOwner ? row.owner_id : undefined,
    title: row.title,
    description: row.description,
    idea_hash: isOwner ? row.idea_hash : undefined,
    visibility: row.visibility,
    status: row.status,
    score: row.score,
    analysis_summary: row.analysis_summary,
    analysis_raw: isOwner ? row.analysis_raw : undefined,
    created_at: row.created_at,
    updated_at: row.updated_at,
    owner_anon: !isOwner,
  };
}


