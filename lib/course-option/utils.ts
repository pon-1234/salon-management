import { Course, Option } from '../types/course-option';
import { courses, options } from './data';

export function getCourseById(id: string): Course | undefined {
  return courses.find(course => course.id === id);
}

export function getOptionById(id: string): Option | undefined {
  return options.find(option => option.id === id);
}
