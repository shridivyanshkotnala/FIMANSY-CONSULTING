import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { setTokens } from "@/Redux/Slices/authSlice";

export default function AuthCallback() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    const accessToken = params.get("accessToken");
    const refreshToken = params.get("refreshToken");
    const onboarded = params.get("onboarded") === "1";

    if (accessToken) {
      dispatch(setTokens({ accessToken, refreshToken }));
      navigate(onboarded ? "/dashboard" : "/onboarding", { replace: true });
      return;
    }

    navigate("/auth", { replace: true });
  }, [dispatch, navigate]);

  return null;
}
