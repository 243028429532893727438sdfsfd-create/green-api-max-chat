export interface GreenApiCredentials {
  apiUrl: string;
  idInstance: string;
  apiTokenInstance: string;
}

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface Message {
  id: string;
  chatId: string;
  sender: string;
  senderName?: string;
  text: string;
  timestamp: number;
  isOutgoing: boolean;
  status: MessageStatus;
}

export interface Chat {
  chatId: string;
  phoneNumber: string;
  name: string;
  avatarColor: string;
  lastMessage?: Message;
  unreadCount: number;
  createdAt: number;
}

export type InstanceState = 
  | 'authorized' 
  | 'notAuthorized' 
  | 'blocked' 
  | 'sleepMode' 
  | 'starting' 
  | 'unknown';

export interface InstanceStatusResponse {
  stateInstance: InstanceState;
}

export interface SendMessageResponse {
  idMessage: string;
}

export interface ReceiveNotificationResponse {
  receiptId: number;
  body: {
    typeWebhook: string;
    instanceData?: {
      idInstance: number | string;
      wid?: string;
      typeInstance?: string;
    };
    timestamp?: number;
    idMessage?: string;
    senderData?: {
      chatId: string;
      chatName?: string;
      chatType?: string;
      sender?: string;
      senderName?: string;
      senderContactName?: string;
      senderPhoneNumber?: number | string;
    };
    messageData?: {
      typeMessage: string;
      textMessageData?: {
        textMessage: string;
      };
      extendedTextMessageData?: {
        text: string;
        description?: string;
        title?: string;
        previewUrl?: string;
      };
      quotedMessage?: {
        stanzaId?: string;
        participant?: string;
        typeMessage?: string;
        textMessage?: string;
      };
    };
    statusData?: {
      status: string;
      sendByApi?: boolean;
    };
  };
}

export interface DeleteNotificationResponse {
  result: boolean;
}
