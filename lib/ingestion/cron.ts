import { runIngestionPipeline } from "@/lib/ingestion/pipeline";

export async function runCronIngestion() {
  return runIngestionPipeline();
}

if (process.argv[1]?.endsWith("cron.ts")) {
  runCronIngestion()
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
