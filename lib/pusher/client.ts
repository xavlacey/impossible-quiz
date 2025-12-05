import PusherClient from "pusher-js";

let pusherInstance: PusherClient | null = null;

export const getPusherClient = () => {
  if (!pusherInstance) {
    pusherInstance = new PusherClient(
      process.env.NEXT_PUBLIC_PUSHER_KEY!,
      {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      }
    );
  }
  return pusherInstance;
};
