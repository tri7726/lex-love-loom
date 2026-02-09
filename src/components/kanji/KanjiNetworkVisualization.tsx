import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { KanjiData } from '@/hooks/useKanjiDetails';

interface NetworkNode extends d3.SimulationNodeDatum {
  id: string;
  character: string;
  hanviet: string;
  jlpt_level: string;
  relationship_type: string;
  isCurrent?: boolean;
  x?: number;
  y?: number;
}

interface NetworkLink extends d3.SimulationLinkDatum<NetworkNode> {
  source: NetworkNode | string;
  target: NetworkNode | string;
  strength: number;
  relationship_type: string;
}

interface KanjiNetworkProps {
  centerKanji: KanjiData;
  relatedKanji: any[];
  onKanjiClick: (character: string) => void;
}

const RELATIONSHIP_COLORS: Record<string, string> = {
  radical: '#f97316',    // orange
  reading: '#eab308',    // yellow
  meaning: '#22c55e',    // green
  component: '#a855f7',  // purple
  compound: '#3b82f6',   // blue
  antonym: '#ef4444',    // red
  synonym: '#06b6d4',    // cyan
};

const KanjiNetworkVisualization: React.FC<KanjiNetworkProps> = ({
  centerKanji,
  relatedKanji,
  onKanjiClick,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  useEffect(() => {
    if (!svgRef.current || relatedKanji.length === 0) return;

    // Clear previous visualization
    d3.select(svgRef.current).selectAll('*').remove();

    const width = 900;
    const height = 600;

    // Create nodes and links
    const nodes: NetworkNode[] = [
      {
        id: centerKanji.id,
        character: centerKanji.character,
        hanviet: centerKanji.hanviet,
        jlpt_level: centerKanji.jlpt_level,
        relationship_type: 'current',
        isCurrent: true,
      },
      ...relatedKanji.map((related) => ({
        id: related.id,
        character: related.character,
        hanviet: related.hanviet,
        jlpt_level: related.jlpt_level,
        relationship_type: related.relationship_type,
        isCurrent: false,
      })),
    ];

    const links: NetworkLink[] = relatedKanji.map((related) => ({
      source: centerKanji.id,
      target: related.id,
      strength: related.strength || 0.5,
      relationship_type: related.relationship_type,
    }));

    // Create SVG
    const svg = d3
      .select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', [0, 0, width, height]);

    // Add zoom behavior
    const g = svg.append('g');

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom as any);

    // Create force simulation
    const simulation = d3
      .forceSimulation<NetworkNode>(nodes)
      .force(
        'link',
        d3.forceLink<NetworkNode, NetworkLink>(links)
          .id((d) => d.id)
          .distance(150)
          .strength((d) => d.strength)
      )
      .force('charge', d3.forceManyBody().strength(-800))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(50));

    // Draw links
    const link = g
      .append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', (d) => RELATIONSHIP_COLORS[d.relationship_type] || '#999')
      .attr('stroke-width', (d) => Math.max(1, d.strength * 3))
      .attr('stroke-opacity', 0.6);

    // Draw nodes
    const node = g
      .append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .style('cursor', 'pointer')
      .call(
        d3.drag<SVGGElement, NetworkNode>()
          .on('start', dragStarted)
          .on('drag', dragged)
          .on('end', dragEnded) as any
      );

    // Node circles
    node
      .append('circle')
      .attr('r', (d) => (d.isCurrent ? 35 : 25))
      .attr('fill', (d) => 
        d.isCurrent ? '#3b82f6' : RELATIONSHIP_COLORS[d.relationship_type] || '#94a3b8'
      )
      .attr('stroke', '#fff')
      .attr('stroke-width', 2);

    // Node labels (kanji character)
    node
      .append('text')
      .text((d) => d.character)
      .attr('font-size', (d) => (d.isCurrent ? '24px' : '18px'))
      .attr('font-family', 'Noto Sans JP, sans-serif')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('fill', '#fff')
      .attr('pointer-events', 'none');

    // Node tooltips (hanviet + JLPT)
    node
      .append('title')
      .text((d) => `${d.character} - ${d.hanviet} (${d.jlpt_level})`);

    // Hover effects
    node
      .on('mouseenter', function (event, d) {
        setHoveredNode(d.id);
        d3.select(this).select('circle')
          .transition()
          .duration(200)
          .attr('r', (data) => (data.isCurrent ? 40 : 30));
      })
      .on('mouseleave', function (event, d) {
        setHoveredNode(null);
        d3.select(this).select('circle')
          .transition()
          .duration(200)
          .attr('r', (data) => (data.isCurrent ? 35 : 25));
      })
      .on('click', (event, d) => {
        if (!d.isCurrent) {
          onKanjiClick(d.character);
        }
      });

    // Update positions on simulation tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      node.attr('transform', (d) => `translate(${d.x},${d.y})`);
    });

    // Drag functions
    function dragStarted(event: any, d: NetworkNode) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: any, d: NetworkNode) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragEnded(event: any, d: NetworkNode) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    // Cleanup
    return () => {
      simulation.stop();
    };
  }, [centerKanji, relatedKanji, onKanjiClick]);

  // Group by relationship type for stats
  const groupedKanji = {
    radical: relatedKanji.filter((k) => k.relationship_type === 'radical'),
    reading: relatedKanji.filter((k) => k.relationship_type === 'reading'),
    meaning: relatedKanji.filter((k) => k.relationship_type === 'meaning'),
    component: relatedKanji.filter((k) => k.relationship_type === 'component'),
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>🕸️ Kanji Network</span>
          <span className="text-sm font-normal text-muted-foreground">
            {relatedKanji.length} related kanji
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Legend */}
        <div className="flex gap-3 flex-wrap text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-blue-500"></div>
            <span>Current ({centerKanji.character})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-orange-500"></div>
            <span>Radical ({groupedKanji.radical.length})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
            <span>Reading ({groupedKanji.reading.length})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-green-500"></div>
            <span>Meaning ({groupedKanji.meaning.length})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-purple-500"></div>
            <span>Component ({groupedKanji.component.length})</span>
          </div>
        </div>

        {/* D3 Visualization */}
        {relatedKanji.length > 0 ? (
          <div className="border rounded-lg bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 overflow-hidden">
            <svg ref={svgRef} className="w-full" style={{ minHeight: '600px' }}></svg>
          </div>
        ) : (
          <div className="border-2 border-dashed rounded-lg p-12 text-center text-muted-foreground">
            <p className="text-lg">No related kanji found</p>
            <p className="text-sm mt-2">
              This kanji doesn't have relationship data yet.
            </p>
          </div>
        )}

        {/* Instructions */}
        <div className="text-xs text-muted-foreground text-center space-y-1">
          <p>💡 <strong>Drag</strong> nodes to rearrange • <strong>Scroll</strong> to zoom • <strong>Click</strong> to navigate</p>
          <p>Thicker lines = stronger relationship</p>
        </div>

        {/* Hovered node info */}
        {hoveredNode && (
          <div className="p-3 bg-accent rounded-lg border text-sm">
            <strong>Hovering:</strong>{' '}
            {relatedKanji.find((k) => k.id === hoveredNode)?.character || centerKanji.character}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default KanjiNetworkVisualization;
