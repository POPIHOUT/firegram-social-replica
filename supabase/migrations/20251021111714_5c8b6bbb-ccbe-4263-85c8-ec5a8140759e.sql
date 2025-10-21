-- First, remove frame selection from profiles
UPDATE profiles SET selected_frame_id = NULL WHERE selected_frame_id IS NOT NULL;

-- Now safely delete frames and user_frames
DELETE FROM user_frames;
DELETE FROM frames;