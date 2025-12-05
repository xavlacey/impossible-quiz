import PusherClient from "pusher-js";

let pusherInstance: PusherClient | null = null;

export const getPusherClient = () => {
  if (!pusherInstance) {
    const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

    console.log("[PusherClient] Initializing Pusher client:", {
      hasKey: !!key,
      hasCluster: !!cluster,
      keyLength: key?.length || 0,
      cluster,
    });

    if (!key || !cluster) {
      const error = new Error(
        "Pusher environment variables are not set. Please set NEXT_PUBLIC_PUSHER_KEY and NEXT_PUBLIC_PUSHER_CLUSTER"
      );
      console.error("[PusherClient] Missing environment variables:", {
        hasKey: !!key,
        hasCluster: !!cluster,
      });
      throw error;
    }

    try {
      pusherInstance = new PusherClient(key, {
        cluster,
      });
      console.log("[PusherClient] Pusher client created successfully");
    } catch (error) {
      console.error("[PusherClient] Error creating Pusher client:", {
        error,
        errorMessage: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
  return pusherInstance;
};
