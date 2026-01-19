export {
  detectATSVendor,
  extractCompanyFromURL,
  getUnknownATSGuidance,
  getRelevantScores,
  isSemanticMatchRelevant,
  isRecruiterSearchRelevant,
  ATS_VENDORS,
} from './vendorDetection';

export type {
  ATSVendor,
  ATSVendorType,
  VendorDetectionResult,
} from './vendorDetection';
