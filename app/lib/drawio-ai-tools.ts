import { tool } from 'ai';
import { z } from 'zod';

import {
  executeDrawioEditBatch,
  executeDrawioRead,
} from './drawio-xml-service';
import type { DrawioEditOperation } from '@/app/types/drawio-tools';

const xpathSchema = z.string().min(1, 'XPath 表达式不能为空');

const setAttributeSchema = z.object({
  type: z.literal('set_attribute'),
  xpath: xpathSchema,
  key: z.string().min(1, '属性名不能为空'),
  value: z.string(),
  allow_no_match: z.boolean().optional(),
});

const removeAttributeSchema = z.object({
  type: z.literal('remove_attribute'),
  xpath: xpathSchema,
  key: z.string().min(1, '属性名不能为空'),
  allow_no_match: z.boolean().optional(),
});

const insertElementSchema = z.object({
  type: z.literal('insert_element'),
  target_xpath: xpathSchema,
  new_xml: z.string().min(1, 'new_xml 不能为空'),
  position: z
    .enum(['append_child', 'prepend_child', 'before', 'after'])
    .optional(),
  allow_no_match: z.boolean().optional(),
});

const removeElementSchema = z.object({
  type: z.literal('remove_element'),
  xpath: xpathSchema,
  allow_no_match: z.boolean().optional(),
});

const replaceElementSchema = z.object({
  type: z.literal('replace_element'),
  xpath: xpathSchema,
  new_xml: z.string().min(1, 'new_xml 不能为空'),
  allow_no_match: z.boolean().optional(),
});

const setTextContentSchema = z.object({
  type: z.literal('set_text_content'),
  xpath: xpathSchema,
  value: z.string(),
  allow_no_match: z.boolean().optional(),
});

const operationSchema = z.union([
  setAttributeSchema,
  removeAttributeSchema,
  insertElementSchema,
  removeElementSchema,
  replaceElementSchema,
  setTextContentSchema,
]);

export const drawioReadTool = tool({
  description:
    '使用 XPath 精确读取 DrawIO XML 内容。默认返回根节点，可传入 xpath 参数精确查询元素、属性或文本。',
  inputSchema: z
    .object({
      xpath: z.string().optional(),
    })
    .optional(),
  execute: async (input) => {
    const xpath = input?.xpath?.trim();
    return await executeDrawioRead(xpath);
  },
});

export const drawioEditBatchTool = tool({
  description:
    '基于 XPath 的原子化批量编辑工具。所有操作要么全部成功，要么在任意一步失败时回滚并返回错误。',
  inputSchema: z.object({
    operations: z
      .array(operationSchema)
      .min(1, 'operations 至少包含一项操作'),
  }),
  execute: async ({ operations }) => {
    return await executeDrawioEditBatch({
      operations: operations as DrawioEditOperation[],
    });
  },
});

export const drawioTools = {
  drawio_read: drawioReadTool,
  drawio_edit_batch: drawioEditBatchTool,
};
