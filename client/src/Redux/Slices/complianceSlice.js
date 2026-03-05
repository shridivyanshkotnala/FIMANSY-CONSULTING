import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  // =========================
  // GLOBAL
  // =========================
  searchQuery: "",

  // =========================
  // ORGANIZATION VIEW
  // =========================
  orgView: {
    selectedOrgId: null,
    classification: "all",
    sortBy: "overdue",
    page: 1,
    limit: 20,
  },

  // =========================
  // TICKET LIST VIEW
  // =========================
  ticketView: {
    category: "all",
    status: "all",
    clientUpdatesOnly: false,
    sortBy: "overdue_first",
    page: 1,
    limit: 20,
  },

  // =========================
  // DRAWER STATE
  // =========================
  drawer: {
    selectedTicketId: null,
    open: false,
  },

  // =========================
  // POLLING CONTROL
  // =========================
  polling: {
    activeTicketId: null,
    lastKnownMetaTimestamp: null,
  },
};

const complianceSlice = createSlice({
  name: "complianceUi",
  initialState,
  reducers: {

    // =========================
    // GLOBAL SEARCH
    // =========================
    setSearchQuery(state, action) {
      state.searchQuery = action.payload;
      state.orgView.page = 1;
      state.ticketView.page = 1;
    },

    // =========================
    // ORGANIZATION VIEW
    // =========================
    setSelectedOrg(state, action) {
      state.orgView.selectedOrgId = action.payload;
    },

    setOrgClassification(state, action) {
      state.orgView.classification = action.payload;
      state.orgView.page = 1;
    },

    setOrgSort(state, action) {
      state.orgView.sortBy = action.payload;
      state.orgView.page = 1;
    },

    setOrgPage(state, action) {
      state.orgView.page = action.payload;
    },

    setOrgLimit(state, action) {
      state.orgView.limit = action.payload;
      state.orgView.page = 1;
    },

    resetOrgView(state) {
      state.orgView = initialState.orgView;
    },

    // =========================
    // TICKET VIEW
    // =========================
    setTicketCategory(state, action) {
      state.ticketView.category = action.payload;
      state.ticketView.page = 1;
    },

    setTicketStatus(state, action) {
      state.ticketView.status = action.payload;
      state.ticketView.page = 1;
    },

    setTicketSort(state, action) {
      state.ticketView.sortBy = action.payload;
      state.ticketView.page = 1;
    },

    toggleClientUpdatesOnly(state) {
      state.ticketView.clientUpdatesOnly =
        !state.ticketView.clientUpdatesOnly;
      state.ticketView.page = 1;
    },

    setTicketPage(state, action) {
      state.ticketView.page = action.payload;
    },

    setTicketLimit(state, action) {
      state.ticketView.limit = action.payload;
      state.ticketView.page = 1;
    },

    resetTicketView(state) {
      state.ticketView = initialState.ticketView;
    },

    // =========================
    // DRAWER
    // =========================
    openDrawer(state, action) {
      state.drawer.selectedTicketId = action.payload;
      state.drawer.open = true;
    },

    closeDrawer(state) {
      state.drawer.selectedTicketId = null;
      state.drawer.open = false;
    },

    // =========================
    // POLLING CONTROL
    // =========================
    setActivePollingTicket(state, action) {
      state.polling.activeTicketId = action.payload;
    },

    setLastKnownMetaTimestamp(state, action) {
      state.polling.lastKnownMetaTimestamp = action.payload;
    },

    resetPolling(state) {
      state.polling = initialState.polling;
    },
  },
});

export const {
  setSearchQuery,

  setSelectedOrg,
  setOrgClassification,
  setOrgSort,
  setOrgPage,
  setOrgLimit,
  resetOrgView,

  setTicketCategory,
  setTicketStatus,
  setTicketSort,
  toggleClientUpdatesOnly,
  setTicketPage,
  setTicketLimit,
  resetTicketView,

  openDrawer,
  closeDrawer,

  setActivePollingTicket,
  setLastKnownMetaTimestamp,
  resetPolling,
} = complianceSlice.actions;

export default complianceSlice.reducer;