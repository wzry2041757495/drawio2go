const DEFAULT_DIAGRAM_XML = `<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="drawio2go" agent="DrawIO2Go" version="24.7.17" type="device">
  <diagram name="Page-1" id="page1">
    <mxGraphModel dx="1422" dy="794" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="827" pageHeight="1169" math="0" shadow="0">
      <root>
        <mxCell id="0"/>
        <mxCell id="1" parent="0"/>
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>`;

function createDefaultDiagramXml() {
  return DEFAULT_DIAGRAM_XML;
}

module.exports = {
  DEFAULT_DIAGRAM_XML,
  createDefaultDiagramXml,
};
