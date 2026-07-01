-- Setup ON DELETE CASCADE constraints for all tables referencing public.profiles

-- 1. MESSAGES TABLE
ALTER TABLE public.messages 
  DROP CONSTRAINT IF EXISTS messages_sender_id_fkey,
  DROP CONSTRAINT IF EXISTS messages_receiver_id_fkey;

ALTER TABLE public.messages
  ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD CONSTRAINT messages_receiver_id_fkey FOREIGN KEY (receiver_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 2. POSTS TABLE
ALTER TABLE public.posts 
  DROP CONSTRAINT IF EXISTS posts_user_id_fkey;

ALTER TABLE public.posts
  ADD CONSTRAINT posts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 3. COMMENTS TABLE
ALTER TABLE public.comments 
  DROP CONSTRAINT IF EXISTS comments_user_id_fkey,
  DROP CONSTRAINT IF EXISTS comments_post_id_fkey;

ALTER TABLE public.comments
  ADD CONSTRAINT comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD CONSTRAINT comments_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;

-- 4. LIKES TABLE
ALTER TABLE public.likes 
  DROP CONSTRAINT IF EXISTS likes_user_id_fkey,
  DROP CONSTRAINT IF EXISTS likes_post_id_fkey;

ALTER TABLE public.likes
  ADD CONSTRAINT likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD CONSTRAINT likes_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;

-- 5. ACTIVITIES TABLE
ALTER TABLE public.activities 
  DROP CONSTRAINT IF EXISTS activities_user_id_fkey;

ALTER TABLE public.activities
  ADD CONSTRAINT activities_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 6. CHALLENGES TABLE
ALTER TABLE public.challenges 
  DROP CONSTRAINT IF EXISTS challenges_author_id_fkey;

ALTER TABLE public.challenges
  ADD CONSTRAINT challenges_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 7. CHALLENGE SUBMISSIONS TABLE
ALTER TABLE public.challenge_submissions 
  DROP CONSTRAINT IF EXISTS challenge_submissions_user_id_fkey,
  DROP CONSTRAINT IF EXISTS challenge_submissions_challenge_id_fkey;

ALTER TABLE public.challenge_submissions
  ADD CONSTRAINT challenge_submissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD CONSTRAINT challenge_submissions_challenge_id_fkey FOREIGN KEY (challenge_id) REFERENCES public.challenges(id) ON DELETE CASCADE;

-- 8. FOLLOWERS TABLE
ALTER TABLE public.followers 
  DROP CONSTRAINT IF EXISTS followers_follower_id_fkey,
  DROP CONSTRAINT IF EXISTS followers_following_id_fkey;

ALTER TABLE public.followers
  ADD CONSTRAINT followers_follower_id_fkey FOREIGN KEY (follower_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD CONSTRAINT followers_following_id_fkey FOREIGN KEY (following_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 9. USER_BADGES TABLE
ALTER TABLE public.user_badges 
  DROP CONSTRAINT IF EXISTS user_badges_user_id_fkey;

ALTER TABLE public.user_badges
  ADD CONSTRAINT user_badges_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
