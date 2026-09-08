export interface ReviewValidationResult {
  isValid: boolean;
  errors: string[];
}

export function validateCreateReviewData(data: Record<string, unknown>): ReviewValidationResult {
  const errors: string[] = [];

  if (!data || typeof data !== 'object') {
    return { isValid: false, errors: ['Request body must be a valid JSON object'] };
  }

  // Validate mentorId
  if (!data.mentorId || typeof data.mentorId !== 'string' || data.mentorId.trim().length === 0) {
    errors.push('Mentor ID is required and must be a non-empty string');
  }

  // Validate codeQualityScore
  if (data.codeQualityScore === undefined || data.codeQualityScore === null) {
    errors.push('Code quality score is required');
  } else if (typeof data.codeQualityScore !== 'number' || !Number.isInteger(data.codeQualityScore)) {
    errors.push('Code quality score must be an integer');
  } else if (data.codeQualityScore < 1 || data.codeQualityScore > 10) {
    errors.push('Code quality score must be an integer between 1 and 10');
  }

  // Validate innovationScore
  if (data.innovationScore === undefined || data.innovationScore === null) {
    errors.push('Innovation score is required');
  } else if (typeof data.innovationScore !== 'number' || !Number.isInteger(data.innovationScore)) {
    errors.push('Innovation score must be an integer');
  } else if (data.innovationScore < 1 || data.innovationScore > 10) {
    errors.push('Innovation score must be an integer between 1 and 10');
  }

  // Validate completenessScore
  if (data.completenessScore === undefined || data.completenessScore === null) {
    errors.push('Completeness score is required');
  } else if (typeof data.completenessScore !== 'number' || !Number.isInteger(data.completenessScore)) {
    errors.push('Completeness score must be an integer');
  } else if (data.completenessScore < 1 || data.completenessScore > 10) {
    errors.push('Completeness score must be an integer between 1 and 10');
  }

  // Validate comments
  if (data.comments !== undefined && data.comments !== null && data.comments !== '') {
    if (typeof data.comments !== 'string') {
      errors.push('Comments must be a string if provided');
    } else if (data.comments.length > 2000) {
      errors.push('Comments must be 2000 characters or less');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
