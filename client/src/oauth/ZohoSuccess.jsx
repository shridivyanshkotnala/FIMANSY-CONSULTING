import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { baseApi } from "@/Redux/Slices/api/baseApi";

export default function ZohoSuccess() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  useEffect(() => {
    // tell RTK Query Zoho status changed
    dispatch(baseApi.util.invalidateTags(["Zoho"]));

    // go back to app
    navigate("/", { replace: true });
  }, []);

  return null;
}
