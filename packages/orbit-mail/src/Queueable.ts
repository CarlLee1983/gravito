export interface Queueable {
  /**
   * The name of the queue the job should be sent to.
   */
  queueName?: string;

  /**
   * The name of the connection the job should be sent to.
   */
  connectionName?: string;

  /**
   * The number of seconds to delay the job.
   */
  delaySeconds?: number;

  /**
   * Set the desired queue for the job.
   * @param queue
   */
  onQueue(queue: string): this;

  /**
   * Set the desired connection for the job.
   * @param connection
   */
  onConnection(connection: string): this;

  /**
   * Set the delay for the job in seconds.
   * @param delay
   */
  delay(delay: number): this;
}
