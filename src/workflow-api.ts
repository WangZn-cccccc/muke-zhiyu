export type WorkflowRequest = {
  user_input: string;
  conversation_context?: string;
  conversation_id?: string;
  request_id?: string;
};

export type WorkflowQuestion = {
  id: string;
  target_field?: string;
  question: string;
  question_type: 'open' | 'single_choice';
  options: Array<{ value: string; label: string }>;
  allow_other: boolean;
  required: boolean;
};

export type WorkflowDiagnosis = {
  disease_name: string;
  display_title: string;
  confidence: 'low' | 'medium' | 'high';
  evidence: Array<{ text: string; source_type: string; source_ref: string }>;
  differential_notes: string[];
  missing_information: string[];
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  warning: string;
};

export type WorkflowDirection = {
  id: string;
  name: string;
  description: string;
  target_problem?: string;
  mechanism?: string;
  expected_improvement?: string;
  direction_type: 'product' | 'management';
  priority: number;
  product_category_tags: string[];
  company_product_categories: string[];
  prefer_company_product: boolean;
  source_rule_id: string;
};

export type WorkflowProduct = {
  product_id: string;
  product_name: string;
  manufacturer?: string | null;
  product_category?: string | null;
  features?: string[];
  recommendation_reason: string;
  usage?: string | null;
  precautions?: string[];
  official_website?: string | null;
  contact_info?: string | null;
  purchase_url?: string | null;
  source_id: string;
};

export type WorkflowEmergency = {
  emergency_type: string;
  risk_level: 'critical';
  title: string;
  actions: string[];
  stop_recommendation: true;
};

export type WorkflowResponse = {
  contract_version: '1.0.0';
  success: boolean;
  response_type: 'question' | 'diagnosis' | 'direction_selection' | 'product' | 'management' | 'no_match' | 'knowledge' | 'emergency' | 'out_of_scope' | 'service_end' | 'error';
  response: string;
  conversation_id: string;
  case_data: Record<string, unknown>;
  questions: WorkflowQuestion[];
  diagnosis: WorkflowDiagnosis | null;
  solution_directions: WorkflowDirection[];
  selected_direction: string | null;
  management_advice: string[];
  result_mode: 'product' | 'management' | 'no_match' | null;
  recommended_products: WorkflowProduct[];
  emergency: WorkflowEmergency | null;
  service_end_reason: 'testing_required' | 'vet_required' | 'customer_service' | 'follow_up_limit_reached' | null;
  error: { code: string; message: string; retryable: boolean } | null;
  [key: string]: unknown;
};

const proxyUrl = (import.meta.env.VITE_LOCAL_PROXY_URL || '').replace(/\/$/, '');

export type WorkflowContractError = { path: string; message: string };

export class WorkflowClientError extends Error {
  requestId?: string;
  contractErrors: WorkflowContractError[];

  constructor(message: string, requestId?: string, contractErrors: WorkflowContractError[] = []) {
    super(message);
    this.name = 'WorkflowClientError';
    this.requestId = requestId;
    this.contractErrors = contractErrors;
  }
}

export async function runWorkflow(input: WorkflowRequest): Promise<WorkflowResponse> {
  const response = await fetch(`${proxyUrl}/api/workflow/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const payload = await response.json();
  if (!response.ok) {
    const contractErrors = Array.isArray(payload?.contract_errors) ? payload.contract_errors : [];
    const message = response.status === 504
      ? '工作流响应超时，请稍后重新尝试'
      : contractErrors.length
        ? '工作流返回的数据格式需要调整'
        : payload?.error || '工作流暂时不可用';
    throw new WorkflowClientError(message, payload?.request_id, contractErrors);
  }
  return payload as WorkflowResponse;
}
