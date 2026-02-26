import { describe, expect, it } from 'bun:test'
import { Conversation } from '../src/Domain/Entities/Conversation'
import { Message } from '../src/Domain/Entities/Message'

describe('Support Domain - Conversation & Message', () => {
  describe('Conversation Creation', () => {
    it('應該能啟動新對話且初始狀態為 PENDING', () => {
      const conv = Conversation.start('cust-123', {
        type: 'ORDER',
        id: 'ord-456',
      })

      expect(conv.id).toBeDefined()
      const props = conv.unpack()
      expect(props.participantId).toBe('cust-123')
      expect(props.contextType).toBe('ORDER')
      expect(props.contextId).toBe('ord-456')
      expect(props.status).toBe('PENDING')
    })

    it('應該能設置主旨', () => {
      const conv = Conversation.start('cust-123', {
        type: 'FORM',
        subject: '詢問退貨',
      })

      const props = conv.unpack()
      expect(props.subject).toBe('詢問退貨')
    })

    it('應該支援不同的上下文類型', () => {
      const contexts = ['ORDER', 'PRODUCT', 'FORM', 'GENERAL'] as const

      contexts.forEach((type) => {
        const conv = Conversation.start('cust-123', { type })
        const props = conv.unpack()
        expect(props.contextType).toBe(type)
      })
    })

    it('應該自動設置 createdAt 和 lastMessageAt', () => {
      const conv = Conversation.start('cust-123', {
        type: 'ORDER',
      })

      const props = conv.unpack()
      expect(props.createdAt).toBeInstanceOf(Date)
      expect(props.lastMessageAt).toBeInstanceOf(Date)
    })

    it('應該能帶自定義 ID 啟動', () => {
      const conv = new Conversation(
        {
          participantId: 'cust-123',
          contextType: 'ORDER',
          status: 'PENDING',
          lastMessageAt: new Date(),
          createdAt: new Date(),
        },
        'conv-custom-123'
      )

      expect(conv.id).toBe('conv-custom-123')
    })
  })

  describe('Message Creation', () => {
    it('應該能建立新訊息且自動設置 createdAt', () => {
      const msg = Message.create({
        conversationId: 'conv-123',
        sender: 'CUSTOMER',
        type: 'TEXT',
        content: 'Hello support!',
      })

      expect(msg.id).toBeDefined()
      const props = msg.unpack()
      expect(props.conversationId).toBe('conv-123')
      expect(props.sender).toBe('CUSTOMER')
      expect(props.type).toBe('TEXT')
      expect(props.content).toBe('Hello support!')
      expect(props.createdAt).toBeInstanceOf(Date)
    })

    it('應該支援不同的訊息類型', () => {
      const types = ['TEXT', 'IMAGE', 'CARD'] as const

      types.forEach((type) => {
        const msg = Message.create({
          conversationId: 'conv-123',
          sender: 'CUSTOMER',
          type,
          content: `Content of ${type}`,
        })

        const props = msg.unpack()
        expect(props.type).toBe(type)
      })
    })

    it('應該支援來自顧客和客服的訊息', () => {
      const customerMsg = Message.create({
        conversationId: 'conv-123',
        sender: 'CUSTOMER',
        type: 'TEXT',
        content: 'Hello',
      })

      const supportMsg = Message.create({
        conversationId: 'conv-123',
        sender: 'SUPPORT',
        type: 'TEXT',
        content: 'Hi there',
      })

      expect(customerMsg.unpack().sender).toBe('CUSTOMER')
      expect(supportMsg.unpack().sender).toBe('SUPPORT')
    })

    it('應該能儲存 metadata', () => {
      const msg = Message.create({
        conversationId: 'conv-123',
        sender: 'SUPPORT',
        type: 'CARD',
        content: 'Order details',
        metadata: {
          orderId: 'ord-456',
          status: 'shipped',
        },
      })

      const props = msg.unpack()
      expect(props.metadata.orderId).toBe('ord-456')
      expect(props.metadata.status).toBe('shipped')
    })
  })

  describe('Conversation Workflow', () => {
    it('應該能建立對話並添加訊息', () => {
      const conv = Conversation.start('cust-123', {
        type: 'ORDER',
        id: 'ord-456',
      })

      const msg1 = Message.create({
        conversationId: conv.id,
        sender: 'CUSTOMER',
        type: 'TEXT',
        content: 'I have a question',
      })

      const msg2 = Message.create({
        conversationId: conv.id,
        sender: 'SUPPORT',
        type: 'TEXT',
        content: 'How can we help?',
      })

      expect(msg1.unpack().conversationId).toBe(conv.id)
      expect(msg2.unpack().conversationId).toBe(conv.id)
    })

    it('應該能處理多個對話', () => {
      const conv1 = Conversation.start('cust-123', { type: 'ORDER', id: 'ord-1' })
      const conv2 = Conversation.start('cust-456', { type: 'PRODUCT', id: 'prod-1' })

      expect(conv1.id).not.toBe(conv2.id)
      expect(conv1.unpack().participantId).toBe('cust-123')
      expect(conv2.unpack().participantId).toBe('cust-456')
    })
  })

  describe('Edge Cases', () => {
    it('應該能處理長文本訊息', () => {
      const longContent = 'x'.repeat(10000)
      const msg = Message.create({
        conversationId: 'conv-123',
        sender: 'CUSTOMER',
        type: 'TEXT',
        content: longContent,
      })

      expect(msg.unpack().content.length).toBe(10000)
    })

    it('應該能處理複雜的 metadata 結構', () => {
      const msg = Message.create({
        conversationId: 'conv-123',
        sender: 'SUPPORT',
        type: 'CARD',
        content: 'Complex card',
        metadata: {
          nested: {
            deep: {
              structure: 'value',
            },
          },
          array: [1, 2, 3],
        },
      })

      const props = msg.unpack()
      expect(props.metadata.nested.deep.structure).toBe('value')
      expect(props.metadata.array).toEqual([1, 2, 3])
    })

    it('應該能處理空 metadata', () => {
      const msg = Message.create({
        conversationId: 'conv-123',
        sender: 'CUSTOMER',
        type: 'TEXT',
        content: 'Simple message',
      })

      const props = msg.unpack()
      expect(props.metadata).toBeUndefined()
    })
  })
})
