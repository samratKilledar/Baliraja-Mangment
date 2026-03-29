const AdmissionOptions = require('./admissionOptions.model');

const DEFAULT_ADMISSION_TYPES = ['11th', '12th', 'Police', 'Army', 'Summer Camp'];
const DEFAULT_ACADEMIC_STAGES = ['11th Std', '12th Std', 'Police Batch', 'Army Batch', 'Summer Camp'];

function normalizeList(values = [], fallback = []) {
  const source = Array.isArray(values) ? values : [];
  const cleaned = source
    .map((item) => String(item || '').trim())
    .filter(Boolean);
  const unique = Array.from(new Set(cleaned));
  return unique.length ? unique : fallback;
}

async function getOrCreateConfig() {
  let config = await AdmissionOptions.findOne({ key: 'default' });
  if (!config) {
    config = await AdmissionOptions.create({
      key: 'default',
      admissionTypes: DEFAULT_ADMISSION_TYPES,
      academicStages: DEFAULT_ACADEMIC_STAGES
    });
  }
  return config;
}

async function getAdmissionOptions(req, res, next) {
  try {
    const config = await getOrCreateConfig();
    return res.json({
      admissionTypes: normalizeList(config.admissionTypes, DEFAULT_ADMISSION_TYPES),
      academicStages: normalizeList(config.academicStages, DEFAULT_ACADEMIC_STAGES),
      updatedAt: config.updatedAt || null
    });
  } catch (err) {
    return next(err);
  }
}

async function updateAdmissionOptions(req, res, next) {
  try {
    const config = await getOrCreateConfig();
    const admissionTypes = normalizeList(req.body?.admissionTypes, DEFAULT_ADMISSION_TYPES);
    const academicStages = normalizeList(req.body?.academicStages, DEFAULT_ACADEMIC_STAGES);

    config.admissionTypes = admissionTypes;
    config.academicStages = academicStages;
    config.updatedBy = req.user?.sub || null;
    await config.save();

    return res.json({
      message: 'Admission options updated',
      admissionTypes: config.admissionTypes,
      academicStages: config.academicStages,
      updatedAt: config.updatedAt || null
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  getAdmissionOptions,
  updateAdmissionOptions
};
