import {
  Navigate,
} from "react-router-dom";

import {
  useEffect,
  useState,
} from "react";

import { supabase } from "../lib/supabase";

function ProtectedRoute({
  children,
}) {

  const [loading, setLoading] =
    useState(true);

  const [user, setUser] =
    useState(null);

  useEffect(() => {

    const checkUser =
      async () => {

        const {
          data: { user },
        } =
          await supabase.auth.getUser();

        setUser(user);

        setLoading(false);
      };

    checkUser();

  }, []);

  if (loading) {

    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  if (!user) {

    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  return children;
}

export default ProtectedRoute;