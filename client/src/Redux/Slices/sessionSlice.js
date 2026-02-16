//Without this your login will randomly die after token expiry.
import { createSlice } from "@reduxjs/toolkit";

const initialState={
    lastActivity: null,
    expiresAt: null,
    refreshing: false,
}

const sessionSlice = createSlice({
    name: "session",
    initialState,
    reducers: {
        setSessionMeta: (state, action)=>{
            state.lastActivity = Date.now();
            state.expiresAt = action.payload;
        },
        startRefresh:(state)=>{
            state.refreshing = true;
        },
        endRefresh:(state)=>{
            state.refreshing = false;
        },
        clearSession:()=>{
            return initialState;
        }
    }
})

export const { setSessionMeta, startRefresh, endRefresh, clearSession } = sessionSlice.actions;
export default sessionSlice.reducer;