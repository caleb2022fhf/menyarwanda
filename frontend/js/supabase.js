
"use strict";

// MENYARWANDA Supabase Configuration
const SUPABASE_URL = "https://ewqdwmrxklqglqkylxgo.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_nx7hYVOX0Tz1-ewVTns7lw_WFwYrhDd";

// Check whether Supabase library is loaded
if (!window.supabase) {
    console.error("Supabase library is not loaded.");
} else {
    // Create Supabase connection
    window.MENYARWANDA_DB = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY
    );

    console.log("MENYARWANDA connected to Supabase.");
}
