import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Background, Handle, MarkerType, NodeResizer, Panel, Position, ReactFlow, ReactFlowProvider, applyNodeChanges, useReactFlow, type Edge, type Node, type NodeChange, type NodeProps } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { AlertCircle, LayoutGrid, Maximize, Minus, Plus, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ActionTooltip } from '@/components/ActionTooltip';
import { cn } from '@/lib/utils';
import { parseComponents, parseStrings, type Connection, type ScreenRow } from '@/lib/types';
import { isManual, resolveLayout } from '@/lib/canvas-layout';
import { ScreenWireframe } from './ScreenWireframe';

type ScreenData = { screen: ScreenRow; recent: boolean; editable: boolean; onResized: (id: string, b: { x: number; y: number; width: number; height: number }) => void };
type ScreenNode = Node<ScreenData, 'screen'>;

const ScreenNodeView = memo(function ScreenNodeView({ id, data, selected }: NodeProps<ScreenNode>) {
  const s = data.screen, unresolved = parseStrings(s.unresolved);
  return (
    <>
      {data.editable && <NodeResizer isVisible={selected} minWidth={180} minHeight={160} lineClassName="!border-primary" handleClassName="!size-2.5 !rounded-sm !border-primary !bg-card" onResizeEnd={(_, p) => data.onResized(id, p)} />}
      <Handle type="target" position={Position.Left} className="!opacity-0" isConnectable={false} />
      <div className={cn('flex size-full flex-col overflow-hidden rounded-xl border bg-sketch text-left shadow-soft', selected && 'ring-2 ring-primary', data.recent && 'changed-pulse border-primary/60')}>
        <div className="flex cursor-grab items-center gap-1.5 border-b bg-muted/50 px-2.5 py-1.5 active:cursor-grabbing">
          <span className="size-1.5 rounded-full bg-sketch-line" /><span className="size-1.5 rounded-full bg-sketch-line" />
          <span className="ml-1 truncate text-[11px] font-medium">{s.name}</span>
          {data.recent && <span className="ml-auto rounded bg-primary-soft px-1.5 text-[9px] font-semibold text-primary">UPDATED</span>}
        </div>
        <div className="flex-1 overflow-hidden p-2.5"><ScreenWireframe components={parseComponents(s.components)} /></div>
        {unresolved.length > 0 && <div className="flex items-center gap-1 border-t bg-unresolved-soft px-2.5 py-1 text-[10px] text-unresolved"><AlertCircle className="size-3 shrink-0" /><span className="truncate">{unresolved.length} unresolved · {unresolved[0]}</span></div>}
      </div>
      <Handle type="source" position={Position.Right} className="!opacity-0" isConnectable={false} />
    </>
  );
});
const nodeTypes = { screen: ScreenNodeView };

type Props = { screens: ScreenRow[]; connections: Connection[]; selectedId: string | null; onSelect: (id: string) => void; recentIds: Set<string>; editable: boolean; onLayoutSaved: () => Promise<unknown> };

export function FlowCanvas(props: Props) {
  if (!props.screens.length) return (
    <div className="grid h-full place-items-center bg-dotgrid p-8 text-center"><div className="max-w-xs"><Sparkles className="mx-auto mb-3 size-6 text-primary" /><p className="font-display text-2xl">Your sketch will appear here</p><p className="mt-2 text-sm text-muted-foreground">Describe your idea in the conversation. Pages and flows are drawn from what you say.</p></div></div>
  );
  return <ReactFlowProvider><Canvas {...props} /></ReactFlowProvider>;
}

function Canvas({ screens, connections, selectedId, onSelect, recentIds, editable, onLayoutSaved }: Props) {
  const flow = useReactFlow();
  const resizedRef = useRef<ScreenData['onResized']>(() => {});
  const onResized = useCallback<ScreenData['onResized']>((id, b) => resizedRef.current(id, b), []);
  const build = useCallback((): ScreenNode[] => {
    const boxes = resolveLayout(screens);
    return screens.map(s => { const b = boxes.get(s.id)!; return { id: s.id, type: 'screen', position: { x: b.x, y: b.y }, width: b.w, height: b.h, selected: s.id === selectedId, data: { screen: s, recent: recentIds.has(s.id), editable, onResized } }; });
  }, [screens, recentIds, editable, selectedId, onResized]);
  const [nodes, setNodes] = useState<ScreenNode[]>(build);
  useEffect(() => setNodes(build()), [build]);
  const edges = useMemo<Edge[]>(() => connections.map(c => ({ id: c.id, source: c.from_screen_id, target: c.to_screen_id, label: c.label || undefined, type: 'smoothstep', style: { strokeDasharray: '4 3', strokeWidth: 1.5 }, className: '[&_path]:!stroke-primary/60', labelStyle: { fontSize: 10 }, markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 } })), [connections]);
  const onNodesChange = useCallback((ch: NodeChange<ScreenNode>[]) => setNodes(n => applyNodeChanges(ch, n)), []);

  /** Layout-only write: never triggers AI and never changes requirements. */
  const persist = useCallback(async (id: string, patch: { layout_x?: number; layout_y?: number; layout_w?: number; layout_h?: number }) => {
    const n = flow.getNode(id); if (!n) return;
    const row = { layout_x: Math.round(n.position.x), layout_y: Math.round(n.position.y), layout_w: Math.round(n.width ?? n.measured?.width ?? 232), layout_h: Math.round(n.height ?? n.measured?.height ?? 290), ...patch };
    const r = await supabase.from('product_screens').update(row).eq('id', id);
    if (r.error) { toast.error('Layout not saved: ' + r.error.message); return; }
    // First manual edit pins every automatically placed page, so later changes never shift them.
    for (const s of screens) {
      if (s.id === id || isManual(s)) continue;
      const o = flow.getNode(s.id); if (!o) continue;
      await supabase.from('product_screens').update({ layout_x: Math.round(o.position.x), layout_y: Math.round(o.position.y), layout_w: Math.round(o.width ?? 232), layout_h: Math.round(o.height ?? 290) }).eq('id', s.id);
    }
    await onLayoutSaved();
  }, [flow, onLayoutSaved, screens]);

  resizedRef.current = (id, b) => void persist(id, { layout_x: Math.round(b.x), layout_y: Math.round(b.y), layout_w: Math.round(b.width), layout_h: Math.round(b.height) });

  const resetLayout = async () => {
    if (screens.some(isManual) && !window.confirm('Replace your manual arrangement with the automatic layout? Pages and links are kept.')) return;
    const r = await supabase.from('product_screens').update({ layout_x: null, layout_y: null, layout_w: null, layout_h: null }).eq('project_id', screens[0]!.project_id);
    if (r.error) { toast.error(r.error.message); return; }
    await onLayoutSaved(); setTimeout(() => void flow.fitView({ padding: 0.15, duration: 300 }), 50);
  };

  return (
    <div className="h-full bg-dotgrid">
      <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} onNodesChange={onNodesChange}
        onNodeClick={(_, n) => onSelect(n.id)} onNodeDragStop={(_, n) => void persist(n.id, { layout_x: Math.round(n.position.x), layout_y: Math.round(n.position.y) })}
        nodesDraggable={editable} nodesConnectable={false} edgesFocusable={false} fitView fitViewOptions={{ padding: 0.15 }} minZoom={0.2} maxZoom={2} proOptions={{ hideAttribution: true }}>
        <Background gap={20} size={1} className="!bg-transparent" />
        <Panel position="bottom-right" className="flex gap-1 rounded-md border bg-card p-1 shadow-soft">
          <ActionTooltip label="Zoom out"><Button size="icon" variant="ghost" className="size-8" aria-label="Zoom out" onClick={() => void flow.zoomOut()}><Minus className="size-4" /></Button></ActionTooltip>
          <ActionTooltip label="Zoom in"><Button size="icon" variant="ghost" className="size-8" aria-label="Zoom in" onClick={() => void flow.zoomIn()}><Plus className="size-4" /></Button></ActionTooltip>
          <ActionTooltip label="Fit to screen"><Button size="icon" variant="ghost" className="size-8" aria-label="Fit to screen" onClick={() => void flow.fitView({ padding: 0.15, duration: 300 })}><Maximize className="size-4" /></Button></ActionTooltip>
          {editable && <ActionTooltip label="Auto-arrange · reset to automatic layout"><Button size="icon" variant="ghost" className="size-8" aria-label="Auto-arrange" onClick={() => void resetLayout()}><LayoutGrid className="size-4" /></Button></ActionTooltip>}
        </Panel>
      </ReactFlow>
    </div>
  );
}

