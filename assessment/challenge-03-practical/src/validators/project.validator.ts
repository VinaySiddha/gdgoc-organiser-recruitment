// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function validateProjectData(data: any, isUpdate = false) {
  const errors: string[] = [];
  const DOMAINS = ['AI/ML', 'Web', 'Mobile', 'Cloud', 'IoT'];

  if (!isUpdate || data.title !== undefined) {
    if (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0) {
      errors.push('Title is required and must be a non-empty string');
    } else if (data.title.length > 100) {
      errors.push('Title must be 100 characters or less');
    }
  }

  if (!isUpdate || data.description !== undefined) {
    if (!data.description || typeof data.description !== 'string' || data.description.trim().length === 0) {
      errors.push('Description is required and must be a non-empty string');
    } else if (data.description.length > 2000) {
      errors.push('Description must be 2000 characters or less');
    }
  }

  if (!isUpdate || data.domain !== undefined) {
    if (!DOMAINS.includes(data.domain)) {
      errors.push(`Domain must be one of: ${DOMAINS.join(', ')}`);
    }
  }

  if (!isUpdate || data.year !== undefined) {
    if (!data.year || typeof data.year !== 'string' || data.year.trim().length === 0) {
      errors.push('Year is required');
    }
  }

  if (!isUpdate || data.techStack !== undefined) {
    if (!Array.isArray(data.techStack) || data.techStack.length === 0) {
      errors.push('Tech Stack must be an array containing at least one technology');
    }
  }

  if (!isUpdate || data.githubUrl !== undefined) {
    try {
      new URL(data.githubUrl);
    } catch {
      errors.push('GitHub URL must be a valid URL');
    }
  }

  if (data.demoUrl !== undefined && data.demoUrl !== null && data.demoUrl !== '') {
    try {
      new URL(data.demoUrl);
    } catch {
      errors.push('Demo URL must be a valid URL when provided');
    }
  }

  if (!isUpdate || data.studentId !== undefined) {
    if (!data.studentId || typeof data.studentId !== 'string') {
      errors.push('Student ID is required');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
