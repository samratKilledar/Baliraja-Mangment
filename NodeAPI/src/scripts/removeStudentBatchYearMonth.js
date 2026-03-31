const { loadEnv } = require('../config/loadEnv');

loadEnv();

const { connectDB } = require('../config/db');
const Student = require('../modules/students/student.model');

async function main() {
  await connectDB(process.env.MONGODB_URI);

  const result = await Student.updateMany(
    {},
    {
      $unset: {
        'details.education.batchYear': '',
        'details.education.batchMonth': ''
      }
    }
  );

  console.log(
    `Batch year/month removed from student details. matched=${result.matchedCount} modified=${result.modifiedCount}`
  );
  process.exit(0);
}

main().catch((error) => {
  console.error(`Failed to remove batch year/month fields: ${error.message}`);
  process.exit(1);
});
