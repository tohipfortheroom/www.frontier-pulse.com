import { runIngestionPipeline } from "./pipeline.ts";

export async function runCronIngestion() {
  return runIngestionPipeline();
}

if (process.argv[1]?.endsWith("cron.ts")) {
  runCronIngestion()
    .then((result) => {
      console.log(
        JSON.stringify(
          {
            ...result,
            previewHeadlines: result.items.slice(0, 5).map((item) => item.headline),
            items: undefined,
          },
          null,
          2,
        ),
      );
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
