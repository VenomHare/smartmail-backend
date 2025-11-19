CREATE TABLE profiles (
    id uuid references auth.users ON DELETE CASCADE PRIMARY KEY,
    username TEXT unique,
    full_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    updated_at TIMESTAMP WITH TIME ZONE,

    CONSTRAINT username_length CHECK (char_length(username) >= 3)
)

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles viewable by everyone"
    ON profiles FOR SELECT
    USING (true);

CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    using (auth.uid() = id)

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER as $$
BEGIN 
    INSERT INTO public.profiles (id, full_name, avatar_url)
    VALUES (
        new.id,
        new.raw_user_meta_data->>'full_name',
        new.raw_user_meta_data->>'avatar_url'
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY definer;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
