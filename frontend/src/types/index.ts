export type Role = 'student' | 'instructor' | 'admin';

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  role: Role;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  created_at: string;
}

export interface Course {
  id: number;
  instructor_id: string | null;
  category_id: number | null;
  title: string;
  slug: string;
  description: string | null;
  price: number;
  image_url: string | null;
  level: 'beginner' | 'intermediate' | 'advanced';
  is_published: boolean;
  created_at: string;
  updated_at: string;
  // Join fields
  profiles?: Profile;
  categories?: Category;
}

export interface Lesson {
  id: number;
  course_id: number;
  title: string;
  content: string | null;
  video_url: string | null;
  position: number;
  is_preview: boolean;
  created_at: string;
}

export interface Enrollment {
  id: number;
  user_id: string;
  course_id: number;
  enrolled_at: string;
  progress: number;
}

export interface Review {
  id: number;
  course_id: number;
  user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  profiles?: Profile;
}
