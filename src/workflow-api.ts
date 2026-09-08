export type WorkflowRequest = {
  user_input: string;
  conversation_context?: string;
  conversation_id?: string;
};

export type WorkflowResponse = {
  contract_version: '1.0.0';
  success: boolean;
  response_type: 'question' | 'diagnosis' | 'direction_selection' | 'product' | 'management' | 'no_match' | 'knowledge' | 'emergency' | 'out_of_scope' | 'service_end' | 'error';
  response: string;
  conversation_id: string;
  questions: Array<{ id: string; question: string; question_type: 'open' | 'single_choice'; options: Array<{ value: string; label: string }>; allow_other: boolean; required: boolean }>;
  [key: string]: unknown;
};

const proxyUrl = import.meta.env.VITE_LOCAL_PROXY_URL || 'http://127.0.0.1:3001';

export async function runWorkflow(input: WorkflowRequest): Promise<WorkflowResponse> {
  const response = await fetch(`${proxyUrl}/api/workflow/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload?.error || '工作流暂时不可用');
  return payload as WorkflowResponse;
}
