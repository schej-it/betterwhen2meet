export default defineEventHandler(async (event) => {
  console.log("event", event);
  return {
    event,
  };
});
