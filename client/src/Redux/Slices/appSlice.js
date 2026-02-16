import {createSlice} from '@reduxjs/toolkit';

const initialState = {
    sidebarOpen: false,
    globalLoading: false,
    theme: 'light',
}

const appSlice = createSlice({
    name : "app",
    initialState,
    reducers:{
        toggleSidebar: (state)=>{
            state.sidebarOpen = !state.sidebarOpen;
        },
        setGlobalLoading :(state, action)=>{
            state.globalLoading = action.payload;
        },
        setTheme: (state, action) =>{
            state.theme = action.payload;
        }
    }
})

export const { toggleSidebar, setGlobalLoading, setTheme } = appSlice.actions;
export default appSlice.reducer;