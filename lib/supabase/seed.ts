import { main } from "../seed/seed-db.ts";

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
