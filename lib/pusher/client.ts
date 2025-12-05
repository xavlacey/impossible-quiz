import PusherClient from "pusher-js";

let pusherInstance: PusherClient | null = null;

export const getPusherClient = () => {
  if (!pusherInstance) {
    pusherInstance = new PusherClient(process.env.PUSHER_KEY!, {
      cluster: process.env.PUSHER_CLUSTER!,
    });
  }
  return pusherInstance;
};
