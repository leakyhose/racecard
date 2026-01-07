import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Warning: Supabase credentials not configured. Set loading will not work.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Lazy-load MC options (trick_terms/trick_definitions) for a public set.
 * Used by the backend when starting a game with MC mode enabled.
 */
export async function loadMCOptionsFromSupabase(
  publicSetId: string,
): Promise<Map<number, { trickTerms: string[]; trickDefinitions: string[] }> | null> {
  try {
    console.log(`[loadMCOptions] Loading MC options for set ${publicSetId}...`);
    const startTime = Date.now();
    
    type MCData = {
      order_index: number;
      trick_terms?: string[];
      trick_definitions?: string[];
    };
    let allData: MCData[] = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from("flashcards")
        .select("order_index, trick_terms, trick_definitions")
        .eq("public_set_id", publicSetId)
        .order("order_index", { ascending: true })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error) throw error;

      if (data && data.length > 0) {
        allData = [...allData, ...data];
        if (data.length < pageSize) {
          hasMore = false;
        } else {
          page++;
        }
      } else {
        hasMore = false;
      }
    }

    const mcMap = new Map<number, { trickTerms: string[]; trickDefinitions: string[] }>();
    for (const card of allData) {
      mcMap.set(card.order_index, {
        trickTerms: card.trick_terms || [],
        trickDefinitions: card.trick_definitions || [],
      });
    }

    console.log(`[loadMCOptions] Loaded MC options for ${mcMap.size} cards in ${Date.now() - startTime}ms`);
    return mcMap;
  } catch (err) {
    console.error("Error loading MC options:", err);
    return null;
  }
}
