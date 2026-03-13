import { configureStore } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";

import { baseApi } from "./Slices/api/baseApi";
import authReducer from "./Slices/authSlice";
import appReducer from "./Slices/appSlice";
import sessionReducer from "./Slices/sessionSlice";
import complianceUiReducer from "./Slices/complianceSlice";

export const store = configureStore({
    reducer : {
        auth : authReducer,
        app : appReducer,
        session: sessionReducer,
        complianceUi: complianceUiReducer,

        [baseApi.reducerPath] : baseApi.reducer
    },

    middleware : (getDefaultMiddleware) =>
        getDefaultMiddleware({serializableCheck: false}).concat(baseApi.middleware),
})

setupListeners(store.dispatch)