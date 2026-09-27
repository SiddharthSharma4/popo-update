import React, { useState, useEffect, useCallback } from "react";
import type {
  TriageCaseResponse,
  QualitySignalResponse,
  ResolutionResponse,
  ResolveTriageCaseRequest,
} from "@osm/shared";
import { triageService } from "../../services/triage-service.ts";
import type { AuthContext } from "../../services/api-client.ts";
import { TriageQueue } from "./TriageQueue.tsx";
import { TriageCaseDetail } from "./TriageCaseDetail.tsx";
import { ResolutionModal } from "./ResolutionModal.tsx";
import { AssignCaseModal } from "./AssignCaseModal.tsx";

interface EscalationHubProps {
  auth: AuthContext;
}

export const EscalationHub: React.FC<EscalationHubProps> = ({ auth }) => {
  const [cases, setCases] = useState<TriageCaseResponse[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [selectedCase, setSelectedCase] = useState<TriageCaseResponse | null>(null);
  const [selectedSignal, setSelectedSignal] = useState<QualitySignalResponse | null>(null);
  const [selectedResolution, setSelectedResolution] = useState<ResolutionResponse | null>(null);

  const [loadingQueue, setLoadingQueue] = useState<boolean>(true);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);
  const [queueError, setQueueError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ message: string; type: "success" | "info" | "error" } | null>(null);

  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [isAssignModalOpen, setIsAssignModalOpen] = useState<boolean>(false);
  const [isResolveModalOpen, setIsResolveModalOpen] = useState<boolean>(false);

  // Load cases queue
  const loadQueue = useCallback(async () => {
    setLoadingQueue(true);
    setQueueError(null);
    try {
      const data = await triageService.listTriageCases(undefined, auth);
      setCases(data);
      // Auto-select first case if none selected
      if (data.length > 0 && !selectedCaseId) {
        setSelectedCaseId(data[0].id);
      }
    } catch (err: unknown) {
      setQueueError(err instanceof Error ? err.message : "Failed to load triage cases");
    } finally {
      setLoadingQueue(false);
    }
  }, [auth, selectedCaseId]);

  // Initial load
  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  // Load selected case details & linked signal
  const loadCaseDetail = useCallback(
    async (caseId: string) => {
      setLoadingDetail(true);
      try {
        const c = await triageService.getTriageCase(caseId, auth);
        setSelectedCase(c);
        setSelectedResolution(null);

        // Fetch linked signal
        if (c.qualitySignalId) {
          try {
            const sig = await triageService.getQualitySignal(c.qualitySignalId, auth);
            setSelectedSignal(sig);
          } catch {
            setSelectedSignal(null);
          }
        } else {
          setSelectedSignal(null);
        }
      } catch (err: unknown) {
        setNotice({
          message: err instanceof Error ? err.message : "Failed to load case detail",
          type: "error",
        });
      } finally {
        setLoadingDetail(false);
      }
    },
    [auth]
  );

  useEffect(() => {
    if (selectedCaseId) {
      loadCaseDetail(selectedCaseId);
    } else {
      setSelectedCase(null);
      setSelectedSignal(null);
      setSelectedResolution(null);
    }
  }, [selectedCaseId, loadCaseDetail]);

  // Handle case selection
  const handleSelectCase = (caseId: string) => {
    setSelectedCaseId(caseId);
    setNotice(null);
  };

  // Handle assignment
  const handleAssign = async (assigneeId: string, expectedVersion: number) => {
    if (!selectedCase) return;
    const updated = await triageService.assignTriageCase(
      selectedCase.id,
      { assigneeId, expectedVersion },
      auth
    );

    setSelectedCase(updated);
    setCases((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    setNotice({
      message: `Case ${updated.caseNumber} assigned to ${assigneeId} (v${updated.version})`,
      type: "success",
    });
  };

  // Handle resolution
  const handleResolve = async (request: ResolveTriageCaseRequest) => {
    if (!selectedCase) return;
    const result = await triageService.resolveTriageCase(selectedCase.id, request, auth);

    setSelectedCase(result.triageCase);
    setSelectedResolution(result.resolution);
    setCases((prev) => prev.map((c) => (c.id === result.triageCase.id ? result.triageCase : c)));
    setNotice({
      message: `Case ${result.triageCase.caseNumber} resolved as ${result.resolution.outcome}`,
      type: "success",
    });
  };

  return (
    <div className="escalation-hub-container" id="osm-escalation-hub">
      {/* Module Title Banner */}
      <div className="escalation-hub-header">
        <div>
          <h1 className="module-title">EscalationHub</h1>
          <p className="module-subtitle">
            Prioritized moderation queue connecting quality signals to human investigation, evidence review,
            and authoritative case resolution (<code>01-product §17</code>, <code>02-architecture §32</code>).
          </p>
        </div>

        <div className="hub-header-actions">
          <button
            className="btn-secondary"
            id="btn-reload-hub"
            onClick={loadQueue}
            disabled={loadingQueue}
          >
            ↻ Refresh Queue
          </button>
        </div>
      </div>

      {/* Global Notice Toast / Alert */}
      {notice && (
        <div className={`notice-banner notice-${notice.type}`} id="osm-hub-notice">
          <span>{notice.message}</span>
          <button className="btn-notice-dismiss" onClick={() => setNotice(null)}>×</button>
        </div>
      )}

      {queueError && (
        <div className="notice-banner notice-error" id="osm-queue-error-banner">
          <span>Error loading queue: {queueError}</span>
          <button className="btn-secondary btn-sm" onClick={loadQueue}>Retry</button>
        </div>
      )}

      {/* Two-Pane Moderation Layout */}
      <div className="hub-two-pane-layout">
        {/* Left Pane: Triage Queue */}
        <div className="pane-queue">
          <TriageQueue
            cases={cases}
            selectedCaseId={selectedCaseId}
            onSelectCase={handleSelectCase}
            loading={loadingQueue}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            priorityFilter={priorityFilter}
            onPriorityFilterChange={setPriorityFilter}
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            onRefresh={loadQueue}
          />
        </div>

        {/* Right Pane: Investigation & Detail */}
        <div className="pane-detail">
          <TriageCaseDetail
            triageCase={selectedCase}
            signal={selectedSignal}
            resolution={selectedResolution}
            loading={loadingDetail}
            auth={auth}
            onOpenAssignModal={() => setIsAssignModalOpen(true)}
            onOpenResolveModal={() => setIsResolveModalOpen(true)}
            onRefreshCase={() => selectedCaseId && loadCaseDetail(selectedCaseId)}
          />
        </div>
      </div>

      {/* Modals */}
      {selectedCase && (
        <>
          <AssignCaseModal
            triageCase={selectedCase}
            isOpen={isAssignModalOpen}
            onClose={() => setIsAssignModalOpen(false)}
            onSubmit={handleAssign}
            onRefreshCase={() => selectedCaseId && loadCaseDetail(selectedCaseId)}
          />

          <ResolutionModal
            triageCase={selectedCase}
            isOpen={isResolveModalOpen}
            onClose={() => setIsResolveModalOpen(false)}
            onSubmit={handleResolve}
            onRefreshCase={() => selectedCaseId && loadCaseDetail(selectedCaseId)}
          />
        </>
      )}
    </div>
  );
};
