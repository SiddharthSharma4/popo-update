import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
import { Alert, Button } from "../ui";

export interface EscalationHubProps {
  auth: AuthContext;
}

export const EscalationHub: React.FC<EscalationHubProps> = ({ auth }) => {
  const { caseId: routeCaseId } = useParams<{ caseId?: string }>();
  const navigate = useNavigate();

  const [cases, setCases] = useState<TriageCaseResponse[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [selectedCase, setSelectedCase] = useState<TriageCaseResponse | null>(null);
  const [selectedSignal, setSelectedSignal] = useState<QualitySignalResponse | null>(null);
  const [selectedResolution, setSelectedResolution] = useState<ResolutionResponse | null>(null);

  const [loadingQueue, setLoadingQueue] = useState<boolean>(true);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);
  const [queueError, setQueueError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ message: string; type: "success" | "warning" | "danger" } | null>(null);

  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("" );

  const [isAssignModalOpen, setIsAssignModalOpen] = useState<boolean>(false);
  const [isResolveModalOpen, setIsResolveModalOpen] = useState<boolean>(false);

  // Load cases queue
  const loadQueue = useCallback(async () => {
    setLoadingQueue(true);
    setQueueError(null);
    try {
      const data = await triageService.listTriageCases(undefined, auth);
      setCases(data);

      // Auto-select based on routeCaseId or first case
      if (data.length > 0) {
        if (routeCaseId && data.some((c) => c.id === routeCaseId)) {
          setSelectedCaseId(routeCaseId);
        } else if (!selectedCaseId) {
          setSelectedCaseId(data[0].id);
        }
      }
    } catch (err: unknown) {
      setQueueError(err instanceof Error ? err.message : "Failed to load triage cases");
    } finally {
      setLoadingQueue(false);
    }
  }, [auth, routeCaseId, selectedCaseId]);

  // Initial load
  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  // Sync route param changes
  useEffect(() => {
    if (routeCaseId && routeCaseId !== selectedCaseId) {
      setSelectedCaseId(routeCaseId);
    }
  }, [routeCaseId, selectedCaseId]);

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
          type: "danger",
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

  // Handle case selection with URL sync
  const handleSelectCase = (caseId: string) => {
    setSelectedCaseId(caseId);
    setNotice(null);
    navigate(`/moderator/triage/${caseId}`);
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
      message: `Case ${updated.caseNumber} successfully assigned to ${assigneeId}.`,
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
      message: `Case ${result.triageCase.caseNumber} resolved as ${result.resolution.outcome}.`,
      type: "success",
    });
  };

  return (
    <div className="osm-hub-container" id="osm-escalation-hub">
      {/* Module Title Banner */}
      <div className="osm-hub-header">
        <div>
          <h1 className="osm-hub-title">Moderator Triage & Escalation Workspace</h1>
          <p className="osm-hub-subtitle">
            Supervisory moderation hub connecting automated quality signals to human investigation,
            comparative evidence inspection, and authoritative case resolution.
          </p>
        </div>

        <div className="osm-hub-header__actions">
          <Button
            variant="secondary"
            size="sm"
            id="btn-reload-hub"
            onClick={loadQueue}
            loading={loadingQueue}
          >
            ↻ Refresh Queue
          </Button>
        </div>
      </div>

      {/* Global Notice Toast / Alert */}
      {notice && (
        <div style={{ marginBottom: "1rem" }}>
          <Alert
            type={notice.type}
            message={notice.message}
            dismissible
            onDismiss={() => setNotice(null)}
          />
        </div>
      )}

      {queueError && (
        <div style={{ marginBottom: "1rem" }}>
          <Alert
            type="danger"
            title="Queue Synchronization Error"
            message={queueError}
            action={
              <Button size="sm" variant="secondary" onClick={loadQueue}>
                Retry
              </Button>
            }
          />
        </div>
      )}

      {/* Two-Pane Moderation Layout */}
      <div className="osm-hub-split">
        {/* Left Pane: Triage Queue (~38%) */}
        <div className="osm-hub-pane-queue">
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

        {/* Right Pane: Investigation & Detail (~62%) */}
        <div className="osm-hub-pane-detail">
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
