import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

function ProtectedRoute({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <h1 className="text-center mt-10">Loading...</h1>;
  }

  if (!session) {
    return <Navigate to="/login" />;
  }

  return children;
}

export default ProtectedRoute;