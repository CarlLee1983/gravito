import type { Conversation } from '../Entities/Conversation'
import type { Message } from '../Entities/Message'

export interface ISupportRepository {
  saveConversation(conversation: Conversation): Promise<void>
  saveMessage(message: Message): Promise<void>
  findConversationById(id: string): Promise<Conversation | null>
  findMessagesByConversationId(conversationId: string): Promise<Message[]>
  findPendingConversations(): Promise<Conversation[]>
}
