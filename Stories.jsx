import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

function Stories() {
  const [stories, setStories] = useState([]);

  const [image, setImage] = useState(null);

  // Maka stories
  const fetchStories = async () => {
    const { data, error } = await supabase
      .from("stories")
      .select("*")
      .order("id", { ascending: false });

    if (error) {
      console.log(error);
      return;
    }

    // Supprimer stories > 24h
    const now = new Date();

    const validStories = data.filter((story) => {
      const created = new Date(
        story.created_at
      );

      const diffHours =
        (now - created) /
        (1000 * 60 * 60);

      return diffHours < 24;
    });

    setStories(validStories);
  };

  // Ajouter story
  const addStory = async () => {
    if (!image) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const fileName = `${Date.now()}-${
      image.name
    }`;

    // Upload image
    const { error: uploadError } =
      await supabase.storage
        .from("posts")
        .upload(fileName, image);

    if (uploadError) {
      alert(uploadError.message);
      return;
    }

    const { data } = supabase.storage
      .from("posts")
      .getPublicUrl(fileName);

    // Insert story
    const { error } = await supabase
      .from("stories")
      .insert([
        {
          user_email: user.email,
          image: data.publicUrl,
        },
      ]);

    if (error) {
      alert(error.message);
      return;
    }

    setImage(null);

    fetchStories();
  };

  useEffect(() => {
    fetchStories();

    // REALTIME
    const channel = supabase
      .channel("stories-channel")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "stories",
        },
        () => {
          fetchStories();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl shadow-md mb-6">
      <h2 className="text-xl font-bold mb-4 dark:text-white">
        Stories
      </h2>

      {/* Add story */}
      <div className="flex gap-2 mb-4">
        <input
          type="file"
          accept="image/*"
          onChange={(e) =>
            setImage(e.target.files[0])
          }
          className="dark:text-white"
        />

        <button
          onClick={addStory}
          className="bg-blue-600 text-white px-4 rounded-lg"
        >
          Add Story
        </button>
      </div>

      {/* Stories list */}
      <div className="flex gap-4 overflow-x-auto">
        {stories.map((story) => (
          <div
            key={story.id}
            className="min-w-[120px]"
          >
            <img
              src={story.image}
              alt="story"
              className="w-28 h-40 object-cover rounded-2xl border-4 border-pink-500"
            />

            <p className="text-sm mt-2 truncate dark:text-white">
              {story.user_email}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Stories;