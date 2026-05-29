import { useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";

const AuthCallback = () => {
  const { hospital_slug } = useParams<{ hospital_slug: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const access_token = searchParams.get("access_token");
    const refresh_token = searchParams.get("refresh_token");
    const redirect_to = searchParams.get("redirect_to") || `/${hospital_slug}/dashboard`;

    if (!access_token || !refresh_token) {
      navigate(`/${hospital_slug}/login`, { replace: true });
      return;
    }

    supabase.auth.setSession({ access_token, refresh_token }).then(({ error }) => {
      if (error) {
        navigate(`/${hospital_slug}/login`, { replace: true });
      } else {
        navigate(redirect_to, { replace: true });
      }
    });
  }, []);

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
      <div className="flex items-center gap-2 text-slate-500">
        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span>Signing you in...</span>
      </div>
    </div>
  );
};

export default AuthCallback;
