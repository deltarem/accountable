import { reseed } from './seed';

/** The end-to-end database is reseeded before the run. */
export default async function globalSetup() {
  reseed();
}
