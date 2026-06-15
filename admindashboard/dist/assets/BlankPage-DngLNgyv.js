import{_ as PageBreadcrumb}from"./PageBreadcrumb.vue_vue_type_script_setup_true_lang-CuJIjWjN.js";
import{I as AdminLayout}from"./AdminLayout.vue_vue_type_script_setup_true_lang-vAAOklqO.js";
import{a as ref,j as openBlock,k as createBlock,m as withCtx,n as createVNode,r as createElementVNode,f as createTextVNode}from"./index-GwRcjPUc.js";

const _wrap={class:"space-y-6"};
const _card={class:"rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]"};
const _grid={class:"grid gap-6 lg:grid-cols-2"};
const _help={class:"text-sm text-gray-500 dark:text-gray-400"};
const _row={class:"flex items-center gap-3"};
const _colorInput={class:"h-10 w-24 cursor-pointer rounded-lg border border-gray-200 bg-white p-1 dark:border-gray-700 dark:bg-gray-900"};
const _textInput={class:"h-10 w-32 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-indigo-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"};
const _btnBase={class:"inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-medium text-white shadow-sm disabled:opacity-60"};
const _previewCard={class:"rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]"};
const _previewBox={class:"rounded-xl p-6 text-white shadow-sm"};
const _statusText={class:"text-sm text-gray-600 dark:text-gray-300"};

const Component={
  __name:"BlankPage",
  setup(){
    const title=ref("Theme Color");
    const color=ref("#f97316");
    const status=ref("");
    const saving=ref(false);

    const load=async()=>{
      try{
        const res=await fetch("/api/site/theme",{headers:{"Accept":"application/json"}});
        if(res.ok){
          const data=await res.json();
          const c=(data&&((data.theme&&data.theme.primaryColor)||data.primaryColor||data.primary_color||data.color))||null;
          if(typeof c==="string"&&c.trim()) color.value=c.trim();
        }
      }catch(_e){}
    };
    load();

    const save=async()=>{
      saving.value=true;
      status.value="Saving...";
      try{
        const res=await fetch("/api/site/theme",{
          method:"PUT",
          headers:{"Content-Type":"application/json","Accept":"application/json"},
          body:JSON.stringify({primaryColor:color.value})
        });
        status.value=res.ok?"Saved ✅":"Save failed ❌";
      }catch(_e){
        status.value="Save failed ❌";
      }finally{
        saving.value=false;
      }
    };

    const normalizeHex=(v)=>{
      if(!v) return;
      let x=String(v).trim();
      if(!x.startsWith("#")) x="#"+x;
      if(/^#[0-9A-Fa-f]{6}$/.test(x)) color.value=x;
    };

    return (_ctx,_cache)=>(openBlock(),createBlock(AdminLayout,null,{
      default:withCtx(()=>[
        createVNode(PageBreadcrumb,{pageTitle:title.value},null,8,["pageTitle"]),
        createElementVNode("div",_wrap,[
          createElementVNode("div",_card,[
            createElementVNode("h2",{class:"text-lg font-semibold text-gray-900 dark:text-white"},"Website primary color"),
            createElementVNode("p",_help,"Change the main brand color used across the website (buttons, links, highlights)."),
            createElementVNode("div",_grid,[
              createElementVNode("div",{class:"space-y-4"},[
                createElementVNode("div",_row,[
                  createElementVNode("input",{type:"color",value:color.value,class:_colorInput.class,onInput:(e)=>{color.value=e.target.value}},null,40,["value"]),
                  createElementVNode("input",{type:"text",value:color.value,class:_textInput.class,onInput:(e)=>{normalizeHex(e.target.value)},placeholder:"#f97316"},null,40,["value"]),
                  createElementVNode("button",{type:"button",disabled:saving.value,class:_btnBase.class,style:{backgroundColor:color.value},onClick:save},[
                    createTextVNode(saving.value?"Saving...":"Save")
                  ],12,["disabled","style"])
                ]),
                createElementVNode("div",_statusText,[createTextVNode(status.value||" ")])
              ]),
              createElementVNode("div",_previewCard,[
                createElementVNode("div",{class:"space-y-2"},[
                  createElementVNode("div",{class:"text-sm font-medium text-gray-700 dark:text-gray-200"},"Preview"),
                  createElementVNode("div",_previewBox,{style:{backgroundColor:color.value}},[
                    createElementVNode("div",{class:"text-base font-semibold"},"Primary color"),
                    createElementVNode("div",{class:"text-sm opacity-90"},"This is how your website highlight color will look.")
                  ],4)
                ])
              ])
            ])
          ])
        ])
      ]),
      _:1
    }));
  }
};

export{Component as default};
