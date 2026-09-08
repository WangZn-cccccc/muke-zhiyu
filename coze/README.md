# Coze 工作流导出区

当前公网工作流运行在 Coze，本地尚未取得部署项目的完整源码。为使 Git 仓库具备完整复现能力，后续应从当前线上版本导出并补充：

```text
src/graphs/
src/main.py
assets/product_database.json
assets/solution_directions.json
assets/management_rules.json
assets/coze_plugin_schema.json
workflow-response.schema.json
```

导入前必须核对部署版本，避免把旧节点、旧 Prompt 或旧数据库重新带入正式仓库。任何 API Token 都不得放入本目录。

