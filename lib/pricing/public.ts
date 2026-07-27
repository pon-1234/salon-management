/**
 * @design_doc   Public pricing response boundary
 * @related_to   Course, option, and designation-fee public API reads
 * @known_issues Public fields must be extended explicitly when customer-facing pricing changes
 */

interface PublicCourseSource {
  id: unknown
  name: unknown
  duration?: unknown
  price: unknown
  description?: unknown
}

interface PublicOptionSource extends PublicCourseSource {
  category?: unknown
  displayOrder?: unknown
}

interface PublicDesignationFeeSource {
  id: unknown
  name: unknown
  price: unknown
  description?: unknown
  sortOrder?: unknown
}

export function toPublicCourse(course: PublicCourseSource) {
  return {
    id: course.id,
    name: course.name,
    duration: course.duration,
    price: course.price,
    description: course.description,
  }
}

export function toPublicOption(option: PublicOptionSource) {
  return {
    id: option.id,
    name: option.name,
    description: option.description,
    price: option.price,
    duration: option.duration,
    category: option.category,
    displayOrder: option.displayOrder,
  }
}

export function toPublicDesignationFee(fee: PublicDesignationFeeSource) {
  return {
    id: fee.id,
    name: fee.name,
    price: fee.price,
    description: fee.description,
    sortOrder: fee.sortOrder,
  }
}
