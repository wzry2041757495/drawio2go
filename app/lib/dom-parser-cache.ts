import {
  DOMParser as XmldomParser,
  XMLSerializer as XmldomSerializer,
} from "@xmldom/xmldom";

let cachedDomParser: DOMParser | null = null;
let cachedXmlSerializer: XMLSerializer | null = null;

export function getDomParser(): DOMParser | null {
  if (cachedDomParser) return cachedDomParser;

  if (
    typeof window !== "undefined" &&
    typeof window.DOMParser !== "undefined"
  ) {
    cachedDomParser = new window.DOMParser();
    return cachedDomParser;
  }

  try {
    cachedDomParser = new XmldomParser();
    return cachedDomParser;
  } catch {
    return null;
  }
}

export function getXmlSerializer(): XMLSerializer | null {
  if (cachedXmlSerializer) return cachedXmlSerializer;

  if (typeof XMLSerializer !== "undefined") {
    cachedXmlSerializer = new XMLSerializer();
    return cachedXmlSerializer;
  }

  try {
    cachedXmlSerializer = new XmldomSerializer();
    return cachedXmlSerializer;
  } catch {
    return null;
  }
}
