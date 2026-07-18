import supabase from '../database/supabase';
import { formatNotification } from '../../utils/helpers';
import { Server } from 'socket.io';

let ioInstance: Server | null = null;
let userSocketsMap: Map<string, string> | null = null;

export const initNotificationService = (io: Server, userSockets: Map<string, string>) => {
  ioInstance = io;
  userSocketsMap = userSockets;
};

export const sendNotification = async (recipientId: string | number, message: string, type: string = 'general'): Promise<void> => {
  try {
    const { data: notification, error } = await supabase
      .from('notifications')
      .insert([{
        recipient_id: recipientId.toString(),
        message,
        type,
        is_read: false
      }])
      .select('*')
      .single();

    if (error) throw error;

    if (ioInstance && userSocketsMap) {
      const socketId = userSocketsMap.get(recipientId.toString());
      if (socketId) {
        ioInstance.to(socketId).emit('notification', formatNotification(notification));
      }
    }
  } catch (err: any) {
    console.error('Notification creation failed:', err.message);
  }
};
