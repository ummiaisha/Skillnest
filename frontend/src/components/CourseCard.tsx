'use client';

import { Course } from '@/types';

interface CourseCardProps {
  course: Course;
}

export default function CourseCard({ course }: CourseCardProps) {
  return (
    <div className="course-card">
      <div 
        className="course-image" 
        style={{ backgroundImage: `url(${course.image_url || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=800&auto=format&fit=crop'})` }}
      />
      <div className="course-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <span className="badge">
            {course.profiles?.full_name || 'Expert Instructor'}
          </span>
          <span style={{ fontSize: '0.7rem', color: '#a1a1aa', textTransform: 'capitalize' }}>
            {course.level}
          </span>
        </div>
        <h3 className="course-title">{course.title}</h3>
        <p className="course-desc">
          {course.description || 'Master the latest skills with this comprehensive course designed for the modern era.'}
        </p>
        <div className="course-footer">
          <span className="course-price">${course.price}</span>
          <button className="btn btn-primary" style={{ padding: '0.5rem 1.2rem', borderRadius: '12px', fontSize: '0.9rem' }}>
            Enroll Now
          </button>
        </div>
      </div>
    </div>
  );
}
